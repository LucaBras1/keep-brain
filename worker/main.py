#!/usr/bin/env python3
"""
Keep Brain - Python Worker
Handles Google Keep synchronization via gkeepapi
"""

import os
import sys
import json
import time
import signal
import logging
import secrets
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Load environment variables - try multiple locations
load_dotenv(dotenv_path='.env.local')
load_dotenv(dotenv_path='.env')
load_dotenv(dotenv_path='../.env.local')
load_dotenv(dotenv_path='../.env')

import redis
import psycopg2
from psycopg2 import pool as pg_pool
from psycopg2.extras import RealDictCursor
import gpsoauth
import gkeepapi

from keep_sync import KeepSync


# ============================================
# Encryption helpers (matches Node.js AES-256-GCM)
# ============================================

def _derive_encryption_key() -> bytes:
    """Derive 32-byte key from ENCRYPTION_KEY + ENCRYPTION_SALT using scrypt (matches Node.js crypto.scryptSync)."""
    key = os.getenv('ENCRYPTION_KEY')
    salt = os.getenv('ENCRYPTION_SALT')
    if not key or not salt:
        raise ValueError("ENCRYPTION_KEY and ENCRYPTION_SALT environment variables are required")
    return hashlib.scrypt(key.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=32)

_cached_derived_key = None

def _get_derived_key() -> bytes:
    global _cached_derived_key
    if _cached_derived_key is None:
        _cached_derived_key = _derive_encryption_key()
    return _cached_derived_key


def encrypt_value(plaintext: str) -> tuple:
    """Encrypt a string using AES-256-GCM. Returns (encrypted_hex, iv_hex) matching Node.js format."""
    derived_key = _get_derived_key()
    iv = os.urandom(16)
    aesgcm = AESGCM(derived_key)
    # AESGCM.encrypt returns ciphertext + 16-byte auth tag appended
    ct_with_tag = aesgcm.encrypt(iv, plaintext.encode(), None)
    return ct_with_tag.hex(), iv.hex()


def decrypt_value(encrypted_hex: str, iv_hex: str) -> str:
    """Decrypt a string encrypted with AES-256-GCM. Matches Node.js encryption.ts format."""
    derived_key = _get_derived_key()
    iv = bytes.fromhex(iv_hex)
    ct_with_tag = bytes.fromhex(encrypted_hex)
    aesgcm = AESGCM(derived_key)
    plaintext = aesgcm.decrypt(iv, ct_with_tag, None)
    return plaintext.decode()


# ============================================
# Error categorization
# ============================================

def categorize_error(error: Exception) -> str:
    """Kategorizuje chybu pro lepsi UX."""
    error_str = str(error)

    if 'BadAuthentication' in error_str:
        return "BadAuthentication: Pristupovy token expiroval. Odpojte ucet a znovu pripojte pomoci OAuth Token."
    if 'UNKNOWN_ERR' in error_str:
        return "UNKNOWN_ERR: Google odmitl prihlaseni. Pouzijte metodu OAuth Token pro pripojeni."
    if 'NeedsBrowser' in error_str:
        return "NeedsBrowser: Google vyzaduje overeni pres prohlizec. Pouzijte metodu OAuth Token."
    if 'LoginException' in error_str:
        return "Prihlaseni selhalo. Pouzijte metodu OAuth Token pro pripojeni."
    if 'authentication' in error_str.lower():
        return "Chyba overeni. Zkuste odpojit a znovu pripojit ucet pomoci OAuth Token."
    if 'network' in error_str.lower() or 'connection' in error_str.lower():
        return "Chyba sitoveho pripojeni. Zkuste to pozdeji."
    if 'timeout' in error_str.lower():
        return "Spojeni vyprelo. Zkuste synchronizaci znovu."
    if 'ssl' in error_str.lower() or 'certificate' in error_str.lower():
        return "Chyba SSL/TLS certifikatu. Kontaktujte podporu."
    if 'rate' in error_str.lower() or 'limit' in error_str.lower() or '429' in error_str:
        return "Prilis mnoho pozadavku. Pockejte par minut a zkuste znovu."
    return error_str


# ============================================
# Logging
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('keep-brain-worker')

# ============================================
# Configuration
# ============================================

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
DATABASE_URL = os.getenv('DATABASE_URL')
KEEP_SYNC_QUEUE = 'keep-sync'
SYNC_TIMEOUT_SECONDS = 300  # 5 minutes

# ============================================
# Database connection pool
# ============================================

_db_pool = None

def get_db_pool():
    """Get or create database connection pool."""
    global _db_pool
    if _db_pool is None or _db_pool.closed:
        _db_pool = pg_pool.SimpleConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=DATABASE_URL,
            cursor_factory=RealDictCursor,
        )
    return _db_pool


def get_db_connection():
    """Get a connection from the pool."""
    return get_db_pool().getconn()


def return_db_connection(conn):
    """Return a connection to the pool."""
    try:
        get_db_pool().putconn(conn)
    except Exception:
        pass


def get_redis_connection():
    """Create Redis connection."""
    return redis.from_url(REDIS_URL, decode_responses=True)


# ============================================
# Sync timeout handler
# ============================================

class SyncTimeoutError(Exception):
    pass

def _timeout_handler(signum, frame):
    raise SyncTimeoutError(f"Sync operation timed out after {SYNC_TIMEOUT_SECONDS}s")


# ============================================
# Database helpers
# ============================================

def update_user_sync_status(user_id: str, status: str, error: str = None):
    """Update user's sync status in the database."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if status == 'SUCCESS':
                cur.execute("""
                    UPDATE "User"
                    SET "syncStatus" = %s,
                        "lastSyncAt" = NOW(),
                        "syncError" = NULL
                    WHERE id = %s
                """, (status, user_id))
            else:
                cur.execute("""
                    UPDATE "User"
                    SET "syncStatus" = %s,
                        "syncError" = %s
                    WHERE id = %s
                """, (status, error, user_id))
            conn.commit()
    finally:
        return_db_connection(conn)


def generate_android_id() -> str:
    """Generate a random 16-character hex Android ID."""
    return secrets.token_hex(8)


# ============================================
# Authentication methods
# ============================================

def exchange_oauth_token(email: str, oauth_token: str) -> str:
    """Exchange OAuth token for master token using gpsoauth."""
    android_id = generate_android_id()

    try:
        logger.info(f"Exchanging OAuth token for {email}...")
        result = gpsoauth.exchange_token(email, oauth_token, android_id)

        if 'Token' in result:
            logger.info(f"Token exchange successful for {email}")
            return result['Token']
        elif 'Error' in result:
            error_msg = result.get('Error', 'Unknown error')
            logger.error(f"Token exchange failed: {error_msg}")
            raise ValueError(f"Google rejected token: {error_msg}")
        else:
            logger.error(f"Unexpected response: {result}")
            raise ValueError("Unexpected response from Google")

    except Exception as e:
        logger.error(f"Token exchange error: {str(e)}")
        raise ValueError(f"Failed to exchange token: {str(e)}")


def master_login_with_password(email: str, app_password: str) -> str:
    """Login using email + App Password via gkeepapi's built-in login."""
    try:
        logger.info(f"Performing master login for {email}...")
        keep = gkeepapi.Keep()
        keep.login(email, app_password)
        master_token = keep.getMasterToken()

        if master_token:
            logger.info(f"Master login successful for {email}")
            return master_token
        else:
            raise ValueError("Prihlaseni selhalo: Nebyl ziskan master token")

    except gkeepapi.exception.LoginException as e:
        error_str = str(e)
        logger.error(f"Master login failed: {error_str}")
        if 'NeedsBrowser' in error_str:
            raise ValueError(
                "NeedsBrowser: Google vyzaduje overeni pres prohlizec. "
                "Pouzijte metodu OAuth Token pro pripojeni."
            )
        if 'BadAuthentication' in error_str:
            raise ValueError(
                "BadAuthentication: Neplatne prihlaseni. "
                "Pouzijte metodu OAuth Token pro pripojeni."
            )
        if 'UNKNOWN_ERR' in error_str:
            raise ValueError(
                "UNKNOWN_ERR: Google odmitl prihlaseni. "
                "App Password metoda jiz nefunguje. Pouzijte OAuth Token."
            )
        raise ValueError(f"Prihlaseni selhalo: {error_str}")
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Master login error: {str(e)}")
        raise ValueError(f"Prihlaseni selhalo: {str(e)}")


def _store_encrypted_token(user_id: str, master_token: str):
    """Encrypt and store master token in database."""
    encrypted, iv = encrypt_value(master_token)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE "User"
                SET "keepMasterToken" = %s,
                    "keepTokenIv" = %s,
                    "syncStatus" = 'IDLE',
                    "syncError" = NULL
                WHERE id = %s
            """, (encrypted, iv, user_id))
            conn.commit()
    finally:
        return_db_connection(conn)


def _get_decrypted_token(user_data: dict) -> str:
    """Decrypt master token from user data."""
    token = user_data.get('keepMasterToken')
    iv = user_data.get('keepTokenIv')
    if not token:
        raise ValueError("User not connected to Google Keep")

    # If IV exists, token is encrypted
    if iv:
        return decrypt_value(token, iv)
    # Legacy: token stored unencrypted - return as-is
    return token


# ============================================
# Job processing
# ============================================

def process_sync_job(job_data: dict):
    """Process a sync job from the queue."""
    user_id = job_data.get('userId')
    action = job_data.get('action')

    logger.info(f"Processing {action} job for user {user_id}")

    try:
        if action == 'exchange-token':
            email = job_data.get('email')
            oauth_token = job_data.get('oauthToken')
            if not email or not oauth_token:
                raise ValueError("Missing email or OAuth token")

            master_token = exchange_oauth_token(email, oauth_token)
            if master_token:
                _store_encrypted_token(user_id, master_token)
                logger.info(f"Successfully obtained master token for user {user_id}")
            else:
                raise ValueError("Failed to get master token")

        elif action == 'login-token':
            email = job_data.get('email')
            master_token = job_data.get('masterToken')
            if not email or not master_token:
                raise ValueError("Missing email or master token")

            logger.info(f"Validating master token for {email}...")
            keep = gkeepapi.Keep()
            keep.resume(email, master_token)

            _store_encrypted_token(user_id, master_token)
            logger.info(f"Successfully validated and stored master token for user {user_id}")

        elif action == 'login-password':
            email = job_data.get('email')
            app_password = job_data.get('appPassword')
            if not email or not app_password:
                raise ValueError("Missing email or App Password for authentication")

            master_token = master_login_with_password(email, app_password)
            if master_token:
                _store_encrypted_token(user_id, master_token)
                logger.info(f"Successfully authenticated user {user_id} with App Password")
            else:
                raise ValueError("Failed to get master token")

        elif action == 'authenticate':
            email = job_data.get('email')
            password = job_data.get('password')
            if not email or not password:
                raise ValueError("Missing email or password for authentication")

            sync = KeepSync()
            master_token = sync.authenticate(email, password)
            if master_token:
                _store_encrypted_token(user_id, master_token)
                logger.info(f"Successfully authenticated user {user_id}")
            else:
                raise ValueError("Failed to get master token")

        elif action == 'sync':
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT "keepEmail", "keepMasterToken", "keepTokenIv"
                        FROM "User"
                        WHERE id = %s
                    """, (user_id,))
                    user = cur.fetchone()
            finally:
                return_db_connection(conn)

            if not user or not user['keepMasterToken']:
                raise ValueError("User not connected to Google Keep")

            decrypted_token = _get_decrypted_token(user)

            # Set sync timeout (Unix only, Windows uses threading fallback)
            use_alarm = hasattr(signal, 'SIGALRM')
            if use_alarm:
                old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
                signal.alarm(SYNC_TIMEOUT_SECONDS)

            try:
                sync = KeepSync()
                notes = sync.sync_notes(
                    email=user['keepEmail'],
                    master_token=decrypted_token
                )
            finally:
                if use_alarm:
                    signal.alarm(0)
                    signal.signal(signal.SIGALRM, old_handler)

            # Save notes to database
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    notes_created = 0
                    notes_updated = 0

                    for note in notes:
                        cur.execute("""
                            SELECT id FROM "Note"
                            WHERE "userId" = %s AND "keepId" = %s
                        """, (user_id, note['id']))
                        existing = cur.fetchone()

                        if existing:
                            cur.execute("""
                                UPDATE "Note"
                                SET title = %s,
                                    content = %s,
                                    labels = %s,
                                    "isPinned" = %s,
                                    "isArchived" = %s,
                                    "isTrashed" = %s,
                                    color = %s,
                                    "keepUpdatedAt" = %s,
                                    "updatedAt" = NOW()
                                WHERE id = %s
                            """, (
                                note.get('title'),
                                note.get('content', ''),
                                note.get('labels', []),
                                note.get('pinned', False),
                                note.get('archived', False),
                                note.get('trashed', False),
                                note.get('color'),
                                note.get('updated'),
                                existing['id']
                            ))
                            notes_updated += 1
                        else:
                            cur.execute("""
                                INSERT INTO "Note" (
                                    id, "userId", "keepId", title, content,
                                    labels, "isPinned", "isArchived", "isTrashed",
                                    color, source, "processingStatus",
                                    "keepCreatedAt", "keepUpdatedAt",
                                    "createdAt", "updatedAt"
                                ) VALUES (
                                    gen_random_uuid()::text, %s, %s, %s, %s,
                                    %s, %s, %s, %s,
                                    %s, 'keep', 'PENDING',
                                    %s, %s,
                                    NOW(), NOW()
                                )
                            """, (
                                user_id,
                                note['id'],
                                note.get('title'),
                                note.get('content', ''),
                                note.get('labels', []),
                                note.get('pinned', False),
                                note.get('archived', False),
                                note.get('trashed', False),
                                note.get('color'),
                                note.get('created'),
                                note.get('updated')
                            ))
                            notes_created += 1

                    conn.commit()

                    cur.execute("""
                        INSERT INTO "SyncLog" (
                            id, "userId", "startedAt", "completedAt",
                            status, "notesFound", "notesCreated", "notesUpdated"
                        ) VALUES (
                            gen_random_uuid()::text, %s, NOW(), NOW(),
                            'SUCCESS', %s, %s, %s
                        )
                    """, (user_id, len(notes), notes_created, notes_updated))
                    conn.commit()

            finally:
                return_db_connection(conn)

            update_user_sync_status(user_id, 'SUCCESS')
            logger.info(f"Sync completed for user {user_id}: {len(notes)} notes found, {notes_created} created, {notes_updated} updated")

    except SyncTimeoutError as e:
        logger.error(f"Sync timeout for user {user_id}: {str(e)}")
        update_user_sync_status(user_id, 'FAILED', "Synchronizace trvala prilis dlouho. Zkuste to znovu.")
        raise
    except Exception as e:
        categorized_error = categorize_error(e)
        logger.error(f"Sync error for user {user_id}: {categorized_error}")
        update_user_sync_status(user_id, 'FAILED', categorized_error)
        raise


# ============================================
# Main worker loop
# ============================================

def main():
    """Main worker loop."""
    logger.info("Keep Brain Worker starting...")

    import ssl
    logger.info(f"Python: {sys.version}")
    logger.info(f"OpenSSL: {ssl.OPENSSL_VERSION}")
    try:
        import urllib3
        logger.info(f"urllib3: {urllib3.__version__}, gpsoauth: {gpsoauth.__version__}, gkeepapi: {gkeepapi.__version__}")
    except Exception:
        pass

    if not DATABASE_URL:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    # Validate encryption env vars
    enc_key = os.getenv('ENCRYPTION_KEY')
    enc_salt = os.getenv('ENCRYPTION_SALT')
    if not enc_key or not enc_salt:
        logger.warning("ENCRYPTION_KEY/ENCRYPTION_SALT not set - token encryption disabled, using legacy plaintext")

    r = get_redis_connection()
    logger.info(f"Connected to Redis: {REDIS_URL}")

    queue_prefix = f'bull:{KEEP_SYNC_QUEUE}'

    while True:
        try:
            result = r.brpop(f'{queue_prefix}:wait', timeout=5)

            if result:
                _, job_id = result
                job_key = f'{queue_prefix}:{job_id}'
                job_data_json = r.hget(job_key, 'data')

                if job_data_json:
                    job_data = json.loads(job_data_json)
                    logger.info(f"Processing job {job_id}")

                    try:
                        r.zadd(f'{queue_prefix}:active', {job_id: time.time()})
                        process_sync_job(job_data)

                        r.hset(job_key, 'finishedOn', int(time.time() * 1000))
                        r.hset(job_key, 'processedOn', int(time.time() * 1000))
                        r.zrem(f'{queue_prefix}:active', job_id)
                        r.zadd(f'{queue_prefix}:completed', {job_id: time.time()})

                        logger.info(f"Job {job_id} completed successfully")

                    except Exception as e:
                        logger.error(f"Job {job_id} failed: {str(e)}")
                        r.zrem(f'{queue_prefix}:active', job_id)
                        r.zadd(f'{queue_prefix}:failed', {job_id: time.time()})
                        r.hset(job_key, 'failedReason', str(e))
                        r.hset(job_key, 'finishedOn', int(time.time() * 1000))
                else:
                    logger.warning(f"Job {job_id} has no data, skipping")

        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {str(e)}")
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            break
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
            time.sleep(1)

    # Cleanup connection pool
    global _db_pool
    if _db_pool and not _db_pool.closed:
        _db_pool.closeall()


if __name__ == '__main__':
    main()
