import "server-only"

import { createVectorStore } from "./factory"
import type {
  RetrieveBySourceInput,
  RetrievedChunk,
  RetrieveSimilarInput,
  StoredPoint,
  StoreEmbeddingsInput,
  VectorStoreKind,
} from "./types"

export async function storeEmbeddings(
  input: StoreEmbeddingsInput,
  kind?: VectorStoreKind
): Promise<StoredPoint[]> {
  return createVectorStore(kind).store(input)
}

export async function retrieveSimilar(
  input: RetrieveSimilarInput,
  kind?: VectorStoreKind
): Promise<RetrievedChunk[]> {
  return createVectorStore(kind).retrieveSimilar(input)
}

export async function retrieveBySource(
  input: RetrieveBySourceInput,
  kind?: VectorStoreKind
): Promise<RetrievedChunk[]> {
  return createVectorStore(kind).retrieveBySource(input)
}

export { createVectorStore } from "./factory"
export { VectorStoreError } from "./errors"
export { PostgresVectorStore } from "./postgres-store"
export { QdrantVectorStore } from "./qdrant-store"
export type {
  RetrieveBySourceInput,
  RetrievedChunk,
  RetrieveSimilarInput,
  StoredPoint,
  StoreEmbeddingsInput,
  VectorStore,
  VectorStoreKind,
} from "./types"
