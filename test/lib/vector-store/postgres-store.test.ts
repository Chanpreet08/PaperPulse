import { describe, expect, test } from "bun:test"

import { PostgresVectorStore } from "@/lib/vector-store/postgres-store"
import { VectorStoreError } from "@/lib/vector-store/errors"

const store = new PostgresVectorStore()
const chunks = [{ index: 0, text: "hello", embedding: [0.1, 0.2] }]
const source = {
  filename: "notes.txt",
  kind: "text" as const,
  conversationId: "01900000-0000-7000-8000-000000000020",
}

describe("PostgresVectorStore", () => {
  test("store throws not_implemented", async () => {
    try {
      await store.store({ chunks, source })
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("not_implemented")
    }
  })

  test("retrieveSimilar throws not_implemented", async () => {
    try {
      await store.retrieveSimilar({ embedding: [0.1, 0.2] })
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("not_implemented")
    }
  })

  test("retrieveBySource throws not_implemented", async () => {
    try {
      await store.retrieveBySource({ filename: "notes.txt" })
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("not_implemented")
    }
  })
})
