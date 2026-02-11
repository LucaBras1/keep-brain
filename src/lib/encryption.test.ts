import { describe, it, expect, beforeAll } from "vitest"

// Set required env vars before importing
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-for-unit-tests"
  process.env.ENCRYPTION_SALT = "test-salt"
})

describe("encryption", () => {
  it("encrypts and decrypts text correctly", async () => {
    // Dynamic import after env vars are set
    const { encrypt, decrypt } = await import("./encryption")

    const originalText = "Hello, World! This is a secret message."
    const { encrypted, iv } = encrypt(originalText)
    const decrypted = decrypt(encrypted, iv)

    expect(decrypted).toBe(originalText)
  })

  it("produces different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("./encryption")

    const text = "same text"
    const result1 = encrypt(text)
    const result2 = encrypt(text)

    expect(result1.encrypted).not.toBe(result2.encrypted)
    expect(result1.iv).not.toBe(result2.iv)
  })

  it("handles empty strings", async () => {
    const { encrypt, decrypt } = await import("./encryption")

    const { encrypted, iv } = encrypt("")
    const decrypted = decrypt(encrypted, iv)

    expect(decrypted).toBe("")
  })

  it("handles unicode text", async () => {
    const { encrypt, decrypt } = await import("./encryption")

    const unicodeText = "Ahoj svetle! Prilis zlutoucky kun upel dabelske ody."
    const { encrypted, iv } = encrypt(unicodeText)
    const decrypted = decrypt(encrypted, iv)

    expect(decrypted).toBe(unicodeText)
  })

  it("handles long text", async () => {
    const { encrypt, decrypt } = await import("./encryption")

    const longText = "A".repeat(10000)
    const { encrypted, iv } = encrypt(longText)
    const decrypted = decrypt(encrypted, iv)

    expect(decrypted).toBe(longText)
  })

  it("fails with wrong IV", async () => {
    const { encrypt, decrypt } = await import("./encryption")
    const crypto = await import("crypto")

    const { encrypted } = encrypt("test")
    const wrongIv = crypto.default.randomBytes(16).toString("hex")

    expect(() => decrypt(encrypted, wrongIv)).toThrow()
  })
})
