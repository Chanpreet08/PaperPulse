import { uuidv7 } from "uuidv7"

import type { SourceKind } from "@/lib/extraction/types"

import { createQdrantClient } from "./qdrant-client"
import { VectorStoreError } from "./errors"
import type {
  RetrieveBySourceInput,
  RetrievedChunk,
  RetrieveSimilarInput,
  StoredPoint,
  StoreEmbeddingsInput,
  VectorStore,
} from "./types"
import {
  DEFAULT_SIMILAR_LIMIT,
  SCROLL_PAGE_SIZE,
} from "./types"
import {
  assertBySourceInput,
  assertSimilarInput,
  assertStoreInput,
  resolveCollection,
} from "./validate"

const SOURCE_KINDS = new Set<SourceKind>(["pdf", "text", "transcript"])

type PayloadFilter = {
  must: Array<{ key: string; match: { value: string } }>
}

export class QdrantVectorStore implements VectorStore {
  readonly kind = "qdrant" as const

  async store(input: StoreEmbeddingsInput): Promise<StoredPoint[]> {
    const size = assertStoreInput(input)
    const collection = resolveCollection(input.collection)
    const client = createQdrantClient()

    try {
      await this.ensureCollection(client, collection, size)

      const stored: StoredPoint[] = []
      const points = input.chunks.map((chunk) => {
        const id = uuidv7()
        stored.push({ id, index: chunk.index })
        return {
          id,
          vector: chunk.embedding,
          payload: {
            text: chunk.text,
            index: chunk.index,
            filename: input.source.filename,
            kind: input.source.kind,
          },
        }
      })

      await client.upsert(collection, {
        wait: true,
        points,
      })

      return stored
    } catch (error) {
      if (error instanceof VectorStoreError) throw error
      throw new VectorStoreError("upsert_failed", "Failed to store embeddings.", {
        cause: error,
      })
    }
  }

  async retrieveSimilar(input: RetrieveSimilarInput): Promise<RetrievedChunk[]> {
    assertSimilarInput(input)
    const collection = resolveCollection(input.collection)
    const client = createQdrantClient()

    try {
      const response = await client.query(collection, {
        query: input.embedding,
        limit: input.limit ?? DEFAULT_SIMILAR_LIMIT,
        filter: this.buildFilter(input.filter),
        with_payload: true,
        with_vector: true,
      })

      return response.points
        .map((point) => this.toRetrievedChunk(point, point.score))
        .filter((chunk): chunk is RetrievedChunk => chunk !== null)
    } catch (error) {
      if (error instanceof VectorStoreError) throw error
      throw new VectorStoreError(
        "retrieve_failed",
        "Failed to retrieve similar embeddings.",
        { cause: error }
      )
    }
  }

  async retrieveBySource(
    input: RetrieveBySourceInput
  ): Promise<RetrievedChunk[]> {
    assertBySourceInput(input)
    const collection = resolveCollection(input.collection)
    const client = createQdrantClient()

    try {
      const chunks: RetrievedChunk[] = []
      let offset: unknown

      do {
        const page = await client.scroll(collection, {
          filter: this.buildFilter({
            filename: input.filename,
            kind: input.kind,
          }),
          limit: SCROLL_PAGE_SIZE,
          offset: offset as never,
          with_payload: true,
          with_vector: true,
        })

        for (const point of page.points) {
          const chunk = this.toRetrievedChunk(point)
          if (chunk) chunks.push(chunk)
        }

        offset = page.next_page_offset ?? undefined
      } while (offset)

      return chunks.sort((a, b) => a.index - b.index)
    } catch (error) {
      if (error instanceof VectorStoreError) throw error
      throw new VectorStoreError(
        "retrieve_failed",
        "Failed to retrieve embeddings by source.",
        { cause: error }
      )
    }
  }

  private async ensureCollection(
    client: ReturnType<typeof createQdrantClient>,
    collection: string,
    size: number
  ) {
    const { exists } = await client.collectionExists(collection)
    if (!exists) {
      await client.createCollection(collection, {
        vectors: { size, distance: "Cosine" },
      })
      return
    }

    const info = await client.getCollection(collection)
    const existingSize = this.collectionVectorSize(info)
    if (existingSize !== undefined && existingSize !== size) {
      throw new VectorStoreError(
        "invalid_vector",
        `Collection "${collection}" expects ${existingSize}-d vectors.`
      )
    }
  }

  private collectionVectorSize(info: {
    config?: { params?: { vectors?: unknown } }
  }): number | undefined {
    const vectors = info.config?.params?.vectors
    if (
      vectors &&
      typeof vectors === "object" &&
      "size" in vectors &&
      typeof vectors.size === "number"
    ) {
      return vectors.size
    }
    return undefined
  }

  private buildFilter(filter?: {
    filename?: string
    kind?: SourceKind
  }): PayloadFilter | undefined {
    if (!filter) return undefined

    const must: PayloadFilter["must"] = []
    if (filter.filename) {
      must.push({ key: "filename", match: { value: filter.filename } })
    }
    if (filter.kind) {
      must.push({ key: "kind", match: { value: filter.kind } })
    }

    return must.length ? { must } : undefined
  }

  private toRetrievedChunk(
    point: {
      id: string | number
      payload?: Record<string, unknown> | null
      vector?: unknown
      score?: number
    },
    score?: number
  ): RetrievedChunk | null {
    const payload = point.payload ?? {}
    const kind = payload.kind
    if (typeof payload.text !== "string" || typeof payload.filename !== "string") {
      return null
    }
    if (typeof kind !== "string" || !SOURCE_KINDS.has(kind as SourceKind)) {
      return null
    }

    const index = typeof payload.index === "number" ? payload.index : 0
    const embedding = this.asVector(point.vector)

    return {
      id: String(point.id),
      index,
      text: payload.text,
      filename: payload.filename,
      kind: kind as SourceKind,
      score: score ?? point.score,
      embedding,
    }
  }

  private asVector(vector: unknown): number[] {
    if (Array.isArray(vector) && vector.every((value) => typeof value === "number")) {
      return vector
    }
    if (vector && typeof vector === "object") {
      const first = Object.values(vector as Record<string, unknown>)[0]
      if (Array.isArray(first) && first.every((value) => typeof value === "number")) {
        return first
      }
    }
    return []
  }
}
