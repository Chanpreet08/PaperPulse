import path from "node:path"
import { readFile } from "node:fs/promises"

import { afterEach, describe, expect, spyOn, test } from "bun:test"

import {
  IndexError,
  indexSource,
  resolveSafePath,
} from "@/features/indexing"
import * as embeddings from "@/lib/embeddings"
import { ExtractionError } from "@/lib/extraction/errors"
import * as vectorStore from "@/lib/vector-store"

const spies: Array<ReturnType<typeof spyOn>> = []

afterEach(() => {
  for (const restore of spies.splice(0)) {
    restore.mockRestore()
  }
})

function mockEmbedAndStore() {
  spies.push(
    spyOn(embeddings, "embedText").mockResolvedValue([
      { index: 0, text: "mocked", embedding: [0.1, 0.2, 0.3] },
    ])
  )
  spies.push(
    spyOn(vectorStore, "storeEmbeddings").mockResolvedValue([
      { id: "point-1", index: 0 },
    ])
  )
}

describe("resolveSafePath", () => {
  test("resolves paths within INDEX_FILES_DIR", () => {
    process.env.INDEX_FILES_DIR = "./uploads"
    const resolved = resolveSafePath("notes/sample.txt")
    expect(resolved).toBe(
      path.resolve(process.env.INDEX_FILES_DIR, "notes/sample.txt")
    )
  })

  test("rejects paths that escape INDEX_FILES_DIR", () => {
    process.env.INDEX_FILES_DIR = "./uploads"
    try {
      resolveSafePath("../../../etc/passwd")
      throw new Error("Expected IndexError")
    } catch (error) {
      expect(error).toBeInstanceOf(IndexError)
      if (error instanceof IndexError) {
        expect(error.code).toBe("invalid_path")
      }
    }
  })
})

describe("indexSource", () => {
  test("indexes an uploaded text file end-to-end", async () => {
    mockEmbedAndStore()

    const fixturePath = path.join(import.meta.dir, "fixtures", "sample.txt")
    const bytes = await readFile(fixturePath)

    const result = await indexSource({
      type: "file",
      filename: "sample.txt",
      bytes: new Uint8Array(bytes),
    })

    expect(result).toEqual({
      source: "sample.txt",
      kind: "text",
      chunkCount: 1,
      points: [{ id: "point-1", index: 0 }],
    })
  })

  test("propagates not_implemented from URL extraction", async () => {
    try {
      await indexSource({
        type: "url",
        url: "https://example.com/article",
      })
      throw new Error("Expected ExtractionError")
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError)
      if (error instanceof ExtractionError) {
        expect(error.code).toBe("not_implemented")
      }
    }
  })
})
