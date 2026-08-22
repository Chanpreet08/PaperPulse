import { describe, expect, test } from "bun:test"

import { chunkText } from "@/lib/embeddings/chunk"
import { EmbeddingError } from "@/lib/embeddings/errors"

describe("chunkText", () => {
  test("keeps short text as a single chunk", async () => {
    expect(await chunkText("Hello paper pulse.")).toEqual(["Hello paper pulse."])
  })

  test("splits long text and overlaps consecutive chunks", async () => {
    const paragraph =
      "Alpha sentence one. Beta sentence two. Gamma sentence three. Delta sentence four."
    const chunks = await chunkText(paragraph, {
      maxChunkChars: 40,
      overlapChars: 10,
    })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join("")).toContain("Alpha")
    expect(chunks.at(-1)).toContain("Delta")

    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-10)
      const overlap = [...prevTail].some((char) => chunks[i].includes(char))
      expect(overlap).toBe(true)
    }
  })

  test("prefers paragraph breaks when splitting", async () => {
    const first = "A".repeat(30)
    const second = "B".repeat(30)
    const chunks = await chunkText(`${first}\n\n${second}`, {
      maxChunkChars: 40,
      overlapChars: 0,
    })

    expect(chunks.length).toBe(2)
    expect(chunks[0]).toBe(first)
    expect(chunks[1]).toBe(second)
  })

  test("throws empty_text for whitespace-only input", async () => {
    await expect(chunkText("   \n\t  ")).rejects.toBeInstanceOf(EmbeddingError)

    try {
      await chunkText("")
      throw new Error("Expected EmbeddingError")
    } catch (error) {
      expect(error).toBeInstanceOf(EmbeddingError)
      expect((error as EmbeddingError).code).toBe("empty_text")
    }
  })
})
