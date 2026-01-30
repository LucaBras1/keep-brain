#!/usr/bin/env python3
"""
Keep Brain - Python Worker
Handles Google Keep synchronization via gkeepapi
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../.env.local')

import redis
import psycopg2
from psycopg2.extras import RealDictCursor

from keep_sync import KeepSync


def categorize_error(error: Exception) -> str:
    """
    Kategorizuje chybu pro lepsí UX.
    Vrací user-friendly chybovou zprávu.
    """
    error_str = str(error)

    # Authentication errors
    if 'BadAuthentication' in error_str:
        return "BadAuthentication: Pristupovy token expiroval. Odpojte ucet a znovu pripojte pomoci App Password."
    if 'LoginException' in error_str:
        return "Prihlaseni selhalo. Zkontrolujte ze pouzivate App Password (ne bezne heslo)."
    if 'authentication' in error_str.lower():
        return "Chyba overeni. Zkuste odpojit a znovu pripojit ucet."

    # Network errors
    if 'network' in error_str.lower() or 'connection' in error_str.lower():
        return "Chyba sitoveho pripojeni. Zkuste to pozdeji."
    if 'timeout' in error_str.lower():
        return "Spojeni vyprelo. Zkuste synchronizaci znovu."

    # SSL/TLS errors
    if 'ssl' in error_str.lower() or 'certificate' in error_str.lower():
        return "Chyba SSL/TLS certifikatu. Kontaktujte podporu."

    # Rate limiting
    if 'rate' in error_str.lower() or 'limit' in error_str.lower() or '429' in error_str:
        return "Prilis mnoho pozadavku. Pockejte par minut a zkuste znovu."

    # Return original error if no category matches
    return error_str


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('keep-brain-worker')

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
DATABASE_URL = os.getenv('DATABASE_URL')

# Queue names
KEEP_SYNC_QUEUE = 'keep-sync'


def get_redis_connection():
    """Create Redis connection."""
    return redis.from_url(REDIS_URL, decode_responses=True)


def get_db_connection():
    """Create PostgreSQL connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


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
        conn.close()


def process_sync_job(job_data: dict):
    """Process a sync job from the queue."""
    user_id = job_data.get('userId')
    action = job_data.get('action')

    logger.info(f"Processing {action} job for user {user_id}")

    try:
        if action == 'authenticate':
            # Get credentials from job data
            email = job_data.get('email')
            password = job_data.get('password')

            if not email or not password:
                raise ValueError("Missing email or password for authentication")

            # Authenticate and get master token
            sync = KeepSync()
            master_token = sync.authenticate(email, password)

            if master_token:
                # Store encrypted master token in database
                # Note: In production, we'd encrypt this properly
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        cur.execute("""
                            UPDATE "User"
                            SET "keepMasterToken" = %s,
                                "syncStatus" = 'IDLE'
                            WHERE id = %s
                        """, (master_token, user_id))
                        conn.commit()
                finally:
                    conn.close()

                logger.info(f"Successfully authenticated user {user_id}")
            else:
                raise ValueError("Failed to get master token")

        elif action == 'sync':
            # Get user's Keep credentials
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
                conn.close()

            if not user or not user['keepMasterToken']:
                raise ValueError("User not connected to Google Keep")

            # Sync notes from Google Keep
            sync = KeepSync()
            notes = sync.sync_notes(
                email=user['keepEmail'],
                master_token=user['keepMasterToken']
            )

            # Save notes to database
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    notes_created = 0
                    notes_updated = 0

                    for note in notes:
                        # Check if note already exists
                        cur.execute("""
                            SELECT id FROM "Note"
                            WHERE "userId" = %s AND "keepId" = %s
                        """, (user_id, note['id']))
                        existing = cur.fetchone()

                        if existing:
                            # Update existing note
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
                            # Create new note
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

                    # Log sync results
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
                conn.close()

            update_user_sync_status(user_id, 'SUCCESS')
            logger.info(f"Sync completed for user {user_id}: {len(notes)} notes found")

    except Exception as e:
        categorized_error = categorize_error(e)
        logger.error(f"Sync error for user {user_id}: {categorized_error}")
        update_user_sync_status(user_id, 'FAILED', categorized_error)
        raise


def main():
    """Main worker loop."""
    logger.info("Keep Brain Worker starting...")

    if not DATABASE_URL:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    r = get_redis_connection()
    logger.info(f"Connected to Redis: {REDIS_URL}")

    while True:
        try:
            # Wait for jobs from the queue (blocking pop)
            result = r.brpop(f'bull:{KEEP_SYNC_QUEUE}:wait', timeout=5)

            if result:
                queue_name, job_id = result

                # Get job data
                job_key = f'bull:{KEEP_SYNC_QUEUE}:{job_id}'
                job_json = r.get(job_key)

                if job_json:
                    job = json.loads(job_json)
                    job_data = job.get('data', {})

                    logger.info(f"Processing job {job_id}")

                    try:
                        process_sync_job(job_data)

                        # Mark job as completed
                        r.lpush(f'bull:{KEEP_SYNC_QUEUE}:completed', job_id)
                        r.delete(job_key)

                    except Exception as e:
                        logger.error(f"Job {job_id} failed: {str(e)}")

                        # Mark job as failed
                        r.lpush(f'bull:{KEEP_SYNC_QUEUE}:failed', job_id)

        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {str(e)}")
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            break
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
            time.sleep(1)


if __name__ == '__main__':
    main()
