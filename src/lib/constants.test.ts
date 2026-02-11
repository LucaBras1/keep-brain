import { describe, it, expect } from "vitest"
import {
  CATEGORY_MAP,
  POTENTIAL_MAP,
  TYPE_MAP,
  CLAUDE_MODELS,
  OPENAI_MODELS,
  QUEUE_NAMES,
  SSE_EVENTS,
  NOTE_SOURCES,
} from "./constants"

describe("constants", () => {
  describe("CATEGORY_MAP", () => {
    it("maps all expected categories", () => {
      expect(CATEGORY_MAP["business"]).toBe("BUSINESS")
      expect(CATEGORY_MAP["ai"]).toBe("AI")
      expect(CATEGORY_MAP["finance"]).toBe("FINANCE")
      expect(CATEGORY_MAP["thought"]).toBe("THOUGHT")
    })

    it("maps Czech values", () => {
      expect(CATEGORY_MAP["myšlenka"]).toBe("THOUGHT")
    })
  })

  describe("POTENTIAL_MAP", () => {
    it("maps English values", () => {
      expect(POTENTIAL_MAP["high"]).toBe("HIGH")
      expect(POTENTIAL_MAP["medium"]).toBe("MEDIUM")
      expect(POTENTIAL_MAP["low"]).toBe("LOW")
    })

    it("maps Czech values", () => {
      expect(POTENTIAL_MAP["vysoký"]).toBe("HIGH")
      expect(POTENTIAL_MAP["střední"]).toBe("MEDIUM")
      expect(POTENTIAL_MAP["nízký"]).toBe("LOW")
    })
  })

  describe("TYPE_MAP", () => {
    it("maps all English type values", () => {
      expect(TYPE_MAP["platform"]).toBe("PLATFORM")
      expect(TYPE_MAP["product"]).toBe("PRODUCT")
      expect(TYPE_MAP["service"]).toBe("SERVICE")
      expect(TYPE_MAP["tool"]).toBe("TOOL")
      expect(TYPE_MAP["concept"]).toBe("CONCEPT")
      expect(TYPE_MAP["insight"]).toBe("INSIGHT")
      expect(TYPE_MAP["wisdom"]).toBe("WISDOM")
      expect(TYPE_MAP["tip"]).toBe("TIP")
    })

    it("maps Czech type values", () => {
      expect(TYPE_MAP["platforma"]).toBe("PLATFORM")
      expect(TYPE_MAP["produkt"]).toBe("PRODUCT")
      expect(TYPE_MAP["služba"]).toBe("SERVICE")
      expect(TYPE_MAP["nástroj"]).toBe("TOOL")
      expect(TYPE_MAP["koncept"]).toBe("CONCEPT")
      expect(TYPE_MAP["postřeh"]).toBe("INSIGHT")
      expect(TYPE_MAP["moudrost"]).toBe("WISDOM")
    })
  })

  describe("AI Models", () => {
    it("has Claude models", () => {
      expect(CLAUDE_MODELS.length).toBeGreaterThan(0)
      expect(CLAUDE_MODELS[0]).toHaveProperty("id")
      expect(CLAUDE_MODELS[0]).toHaveProperty("name")
    })

    it("has OpenAI models", () => {
      expect(OPENAI_MODELS.length).toBeGreaterThan(0)
      expect(OPENAI_MODELS[0]).toHaveProperty("id")
      expect(OPENAI_MODELS[0]).toHaveProperty("name")
    })
  })

  describe("Queue names", () => {
    it("has expected queues", () => {
      expect(QUEUE_NAMES.KEEP_SYNC).toBe("keep-sync")
      expect(QUEUE_NAMES.AI_PROCESSING).toBe("ai-processing")
    })
  })

  describe("SSE events", () => {
    it("has all expected event types", () => {
      expect(SSE_EVENTS.SYNC_STATUS).toBeDefined()
      expect(SSE_EVENTS.SYNC_COMPLETE).toBeDefined()
      expect(SSE_EVENTS.AI_PROCESSING_START).toBeDefined()
      expect(SSE_EVENTS.AI_PROCESSING_COMPLETE).toBeDefined()
      expect(SSE_EVENTS.NOTE_CREATED).toBeDefined()
      expect(SSE_EVENTS.IDEA_CREATED).toBeDefined()
    })
  })

  describe("Note sources", () => {
    it("has expected sources", () => {
      expect(NOTE_SOURCES.KEEP).toBe("keep")
      expect(NOTE_SOURCES.MANUAL).toBe("manual")
      expect(NOTE_SOURCES.QUICK_CAPTURE).toBe("quick_capture")
    })
  })
})
