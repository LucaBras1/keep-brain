import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

let cachedKey: Buffer | null = null
let cachedKeyTimestamp = 0

function getEncryptionKey(): Buffer {
  const now = Date.now()
  if (cachedKey && now - cachedKeyTimestamp < KEY_CACHE_TTL_MS) {
    return cachedKey
  }

  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  const salt = process.env.ENCRYPTION_SALT
  if (!salt) {
    throw new Error("ENCRYPTION_SALT environment variable is not set")
  }

  cachedKey = crypto.scryptSync(key, salt, 32)
  cachedKeyTimestamp = now
  return cachedKey
}

export function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Combine encrypted data with auth tag
  const combined = encrypted + authTag.toString("hex")

  return {
    encrypted: combined,
    iv: iv.toString("hex"),
  }
}

export function decrypt(encrypted: string, iv: string): string {
  const key = getEncryptionKey()
  const ivBuffer = Buffer.from(iv, "hex")

  // Extract auth tag from the end
  const authTag = Buffer.from(
    encrypted.slice(-AUTH_TAG_LENGTH * 2),
    "hex"
  )
  const encryptedText = encrypted.slice(0, -AUTH_TAG_LENGTH * 2)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
