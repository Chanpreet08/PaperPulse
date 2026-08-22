import { describe, expect, mock, test } from "bun:test"

import { EmbeddingError } from "@/lib/embeddings/errors"

mock.module("openai", () => {
  return {
    default: class OpenAI {
      embeddings = {
        create: async ({ input }: { input: string[] }) => ({
          data: input.map((value, index) => ({
            index,
            embedding: [index, value.length],
          })),
        }),
      }
    },
  }
})

const { embedText } = await import("@/lib/embeddings")

describe("embedText", () => {
  test("embeds each chunk in order", async () => {
    process.env.OPENAI_API_KEY = "sk-test"

    const chunks = await embedText("Hello paper pulse.")

    expect(chunks).toEqual([
      {
        index: 0,
        text: "Hello paper pulse.",
        embedding: [0, "Hello paper pulse.".length],
      },
    ])
  })

  test("returns one embedding per chunk for long text", async () => {
    process.env.OPENAI_API_KEY = "sk-test"

    const text = Array.from({ length: 20 }, (_, i) => `Sentence number ${i}.`).join(" ")
    const chunks = await embedText(text, {
      maxChunkChars: 40,
      overlapChars: 8,
    })

    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk, index) => {
      expect(chunk.index).toBe(index)
      expect(chunk.embedding).toEqual([index, chunk.text.length])
    })
  })

  test("throws empty_text before calling OpenAI", async () => {
    process.env.OPENAI_API_KEY = "sk-test"

    try {
      await embedText("   ")
      throw new Error("Expected EmbeddingError")
    } catch (error) {
      expect(error).toBeInstanceOf(EmbeddingError)
      expect((error as EmbeddingError).code).toBe("empty_text")
    }
  })

  test("throws missing_api_key when OPENAI_API_KEY is unset", async () => {
    const previous = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      await embedText("Hello")
      throw new Error("Expected EmbeddingError")
    } catch (error) {
      expect(error).toBeInstanceOf(EmbeddingError)
      expect((error as EmbeddingError).code).toBe("missing_api_key")
    } finally {
      if (previous === undefined) {
        delete process.env.OPENAI_API_KEY
      } else {
        process.env.OPENAI_API_KEY = previous
      }
    }
  })
})
