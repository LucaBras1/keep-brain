import { describe, it, expect } from "vitest"
import {
  registerSchema,
  loginSchema,
  noteSchema,
  ideaSchema,
  keepConnectSchema,
  keepConnectTokenSchema,
  getZodErrorMessage,
} from "./validations"

describe("validations", () => {
  describe("registerSchema", () => {
    it("accepts valid registration", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid email", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      })
      expect(result.success).toBe(false)
    })

    it("rejects short password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "short",
      })
      expect(result.success).toBe(false)
    })

    it("allows optional name", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("loginSchema", () => {
    it("accepts valid login", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      })
      expect(result.success).toBe(true)
    })

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("noteSchema", () => {
    it("accepts valid note", () => {
      const result = noteSchema.safeParse({
        content: "This is a note",
        title: "My Note",
      })
      expect(result.success).toBe(true)
    })

    it("accepts note without title", () => {
      const result = noteSchema.safeParse({
        content: "This is a note",
      })
      expect(result.success).toBe(true)
    })

    it("rejects empty content", () => {
      const result = noteSchema.safeParse({
        content: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("ideaSchema", () => {
    it("accepts valid idea", () => {
      const result = ideaSchema.safeParse({
        title: "Great Idea",
        description: "An amazing idea for a product",
        category: "BUSINESS",
        potential: "HIGH",
        type: "PRODUCT",
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid category", () => {
      const result = ideaSchema.safeParse({
        title: "Great Idea",
        description: "An amazing idea",
        category: "INVALID",
        potential: "HIGH",
        type: "PRODUCT",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("keepConnectSchema", () => {
    it("accepts valid OAuth connection", () => {
      const result = keepConnectSchema.safeParse({
        email: "user@gmail.com",
        oauthToken: "oauth2_4_long_token_here",
      })
      expect(result.success).toBe(true)
    })

    it("rejects short token", () => {
      const result = keepConnectSchema.safeParse({
        email: "user@gmail.com",
        oauthToken: "short",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("keepConnectTokenSchema", () => {
    it("accepts valid master token", () => {
      const result = keepConnectTokenSchema.safeParse({
        email: "user@gmail.com",
        masterToken: "aas_et_long_master_token_value",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("getZodErrorMessage", () => {
    it("returns first issue message", () => {
      const result = registerSchema.safeParse({
        email: "bad",
        password: "x",
      })
      if (!result.success) {
        const message = getZodErrorMessage(result.error)
        expect(message).toBeTruthy()
        expect(typeof message).toBe("string")
      }
    })
  })
})
