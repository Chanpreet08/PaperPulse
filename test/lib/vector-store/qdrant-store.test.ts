import { describe, expect, mock, test } from "bun:test"

import { VectorStoreError } from "@/lib/vector-store/errors"

const upsert = mock(async (..._args: unknown[]) => ({ status: "completed" }))
const query = mock(async (..._args: unknown[]) => ({
  points: [] as Array<Record<string, unknown>>,
}))
const scroll = mock(async (..._args: unknown[]) => ({
  points: [] as Array<Record<string, unknown>>,
  next_page_offset: null as unknown,
}))
const collectionExists = mock(async (..._args: unknown[]) => ({ exists: false }))
const createCollection = mock(async (..._args: unknown[]) => true)
const getCollection = mock(async (..._args: unknown[]) => ({
  config: { params: { vectors: { size: 3, distance: "Cosine" } } },
}))

mock.module("@qdrant/js-client-rest", () => {
  return {
    QdrantClient: class {
      upsert = upsert
      query = query
      scroll = scroll
      collectionExists = collectionExists
      createCollection = createCollection
      getCollection = getCollection
    },
  }
})

const { QdrantVectorStore } = await import("@/lib/vector-store/qdrant-store")

const chunks = [
  { index: 0, text: "hello", embedding: [0.1, 0.2, 0.3] },
  { index: 1, text: "world", embedding: [0.4, 0.5, 0.6] },
]
const source = {
  filename: "notes.txt",
  kind: "text" as const,
  conversationId: "01900000-0000-7000-8000-000000000020",
}

describe("QdrantVectorStore", () => {
  test("throws empty_chunks when there are no chunks", async () => {
    process.env.QDRANT_URL = "http://localhost:6333"
    const store = new QdrantVectorStore()

    try {
      await store.store({ chunks: [], source })
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("empty_chunks")
    }
  })

  test("throws missing_config when QDRANT_URL is unset", async () => {
    const previous = process.env.QDRANT_URL
    delete process.env.QDRANT_URL
    const store = new QdrantVectorStore()

    try {
      await store.store({ chunks, source })
      throw new Error("Expected VectorStoreError")
    } catch (error) {
      expect(error).toBeInstanceOf(VectorStoreError)
      expect((error as VectorStoreError).code).toBe("missing_config")
    } finally {
      if (previous === undefined) {
        delete process.env.QDRANT_URL
      } else {
        process.env.QDRANT_URL = previous
      }
    }
  })

  test("creates the collection and upserts payload metadata", async () => {
    process.env.QDRANT_URL = "http://localhost:6333"
    upsert.mockClear()
    collectionExists.mockClear()
    createCollection.mockClear()
    collectionExists.mockImplementation(async () => ({ exists: false }))

    const store = new QdrantVectorStore()
    const stored = await store.store({ chunks, source })

    expect(createCollection).toHaveBeenCalled()
    expect(stored).toHaveLength(2)

    const upsertArgs = upsert.mock.calls[0] as unknown as [
      string,
      { points: Array<{ payload: Record<string, unknown> }> },
    ]
    expect(upsertArgs[1].points[0]?.payload).toEqual({
      text: "hello",
      index: 0,
      filename: "notes.txt",
      kind: "text",
      conversationId: "01900000-0000-7000-8000-000000000020",
    })
  })

  test("retrieveSimilar returns scored chunks and passes conversationId filter", async () => {
    process.env.QDRANT_URL = "http://localhost:6333"
    query.mockImplementation(async () => ({
      points: [
        {
          id: "a",
          score: 0.9,
          payload: {
            text: "hello",
            index: 0,
            filename: "notes.txt",
            kind: "text",
            conversationId: "01900000-0000-7000-8000-000000000020",
          },
          vector: [0.1, 0.2, 0.3],
        },
      ],
    }))

    const store = new QdrantVectorStore()
    const hits = await store.retrieveSimilar({
      embedding: [0.1, 0.2, 0.3],
      limit: 3,
      filter: { conversationId: "01900000-0000-7000-8000-000000000020" },
    })

    const queryArgs = query.mock.calls.at(-1) as unknown as [
      string,
      { filter: unknown },
    ]
    expect(queryArgs[1].filter).toEqual({
      must: [
        {
          key: "conversationId",
          match: { value: "01900000-0000-7000-8000-000000000020" },
        },
      ],
    })
    expect(hits).toEqual([
      {
        id: "a",
        index: 0,
        text: "hello",
        filename: "notes.txt",
        kind: "text",
        conversationId: "01900000-0000-7000-8000-000000000020",
        score: 0.9,
        embedding: [0.1, 0.2, 0.3],
      },
    ])
  })

  test("retrieveBySource returns chunks for a file sorted by index", async () => {
    process.env.QDRANT_URL = "http://localhost:6333"
    scroll.mockImplementation(async () => ({
      points: [
        {
          id: "b",
          payload: {
            text: "world",
            index: 1,
            filename: "notes.txt",
            kind: "text",
          },
          vector: [0.4, 0.5, 0.6],
        },
        {
          id: "a",
          payload: {
            text: "hello",
            index: 0,
            filename: "notes.txt",
            kind: "text",
          },
          vector: [0.1, 0.2, 0.3],
        },
      ],
      next_page_offset: null,
    }))

    const store = new QdrantVectorStore()
    const hits = await store.retrieveBySource({ filename: "notes.txt" })

    expect(hits.map((hit) => hit.index)).toEqual([0, 1])
    expect(hits[0]?.text).toBe("hello")
  })
})
