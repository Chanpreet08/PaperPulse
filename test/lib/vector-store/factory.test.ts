import { describe, expect, test } from "bun:test"

import { createVectorStore } from "@/lib/vector-store"
import { VectorStoreError } from "@/lib/vector-store/errors"
import { PostgresVectorStore } from "@/lib/vector-store/postgres-store"
import { QdrantVectorStore } from "@/lib/vector-store/qdrant-store"

describe("createVectorStore", () => {
  test("defaults to Qdrant", () => {
    const previous = process.env.VECTOR_STORE
    delete process.env.VECTOR_STORE

    try {
      expect(createVectorStore()).toBeInstanceOf(QdrantVectorStore)
      expect(createVectorStore().kind).toBe("qdrant")
    } finally {
      if (previous === undefined) {
        delete process.env.VECTOR_STORE
      } else {
        process.env.VECTOR_STORE = previous
      }
    }
  })

  test("returns PostgresVectorStore when kind is postgres", () => {
    const store = createVectorStore("postgres")
    expect(store).toBeInstanceOf(PostgresVectorStore)
    expect(store.kind).toBe("postgres")
  })

  test("throws unsupported_store for an unknown kind", () => {
    try {
      createVectorStore("pinecone" as never)
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("unsupported_store")
    }
  })
})
