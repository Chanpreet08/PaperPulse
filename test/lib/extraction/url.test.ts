import { describe, expect, test } from "bun:test"

import { ExtractionError } from "@/lib/extraction/errors"
import { classifyUrl, extractFromUrl } from "@/lib/extraction/url"

describe("classifyUrl", () => {
  test("classifies YouTube watch URLs", () => {
    expect(
      classifyUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("youtube")
  })

  test("classifies youtu.be URLs", () => {
    expect(classifyUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube")
  })

  test("classifies other URLs as website", () => {
    expect(classifyUrl("https://example.com/article")).toBe("website")
  })
})

describe("extractFromUrl", () => {
  test("throws parse_error for an empty URL", async () => {
    try {
      await extractFromUrl("   ")
      throw new Error("Expected ExtractionError")
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError)
      expect((error as ExtractionError).code).toBe("parse_error")
    }
  })

  test("throws parse_error for an invalid URL", async () => {
    try {
      await extractFromUrl("not-a-url")
      throw new Error("Expected ExtractionError")
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError)
      expect((error as ExtractionError).code).toBe("parse_error")
    }
  })

  test("throws not_implemented for YouTube URLs", async () => {
    try {
      await extractFromUrl("https://www.youtube.com/watch?v=abc123")
      throw new Error("Expected ExtractionError")
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError)
      expect((error as ExtractionError).code).toBe("not_implemented")
      expect((error as ExtractionError).message).toContain("youtube")
    }
  })

  test("throws not_implemented for website URLs", async () => {
    try {
      await extractFromUrl("https://example.com/docs")
      throw new Error("Expected ExtractionError")
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError)
      expect((error as ExtractionError).code).toBe("not_implemented")
      expect((error as ExtractionError).message).toContain("website")
    }
  })
})
