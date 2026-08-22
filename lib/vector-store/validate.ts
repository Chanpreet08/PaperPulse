import type { EmbeddedChunk } from "@/lib/embeddings/types"

import { VectorStoreError } from "./errors"
import {
  DEFAULT_COLLECTION,
  type RetrieveBySourceInput,
  type RetrieveSimilarInput,
  type StoreEmbeddingsInput,
} from "./types"

export function resolveCollection(override?: string): string {
  return override || process.env.QDRANT_COLLECTION || DEFAULT_COLLECTION
}

export function assertStoreInput(input: StoreEmbeddingsInput): number {
  if (input.chunks.length === 0) {
    throw new VectorStoreError(
      "empty_chunks",
      "Cannot store an empty chunk list."
    )
  }

  const size = input.chunks[0]?.embedding.length ?? 0
  if (size === 0) {
    throw new VectorStoreError(
      "invalid_vector",
      "Embedding vectors must not be empty."
    )
  }

  const mismatched = input.chunks.some(
    (chunk: EmbeddedChunk) => chunk.embedding.length !== size
  )
  if (mismatched) {
    throw new VectorStoreError(
      "invalid_vector",
      "All embedding vectors must have the same dimensions."
    )
  }

  return size
}

export function assertSimilarInput(input: RetrieveSimilarInput): void {
  if (input.embedding.length === 0) {
    throw new VectorStoreError(
      "invalid_vector",
      "Query embedding must not be empty."
    )
  }
}

export function assertBySourceInput(input: RetrieveBySourceInput): void {
  if (!input.filename.trim()) {
    throw new VectorStoreError(
      "invalid_query",
      "Filename is required to retrieve by source."
    )
  }
}
