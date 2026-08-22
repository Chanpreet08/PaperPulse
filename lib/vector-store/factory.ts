import { VectorStoreError } from "./errors"
import { PostgresVectorStore } from "./postgres-store"
import { QdrantVectorStore } from "./qdrant-store"
import {
  DEFAULT_VECTOR_STORE,
  type VectorStore,
  type VectorStoreKind,
} from "./types"

const STORES: Record<VectorStoreKind, () => VectorStore> = {
  qdrant: () => new QdrantVectorStore(),
  postgres: () => new PostgresVectorStore(),
}

export function createVectorStore(kind?: VectorStoreKind): VectorStore {
  const resolved = kind ?? (process.env.VECTOR_STORE as VectorStoreKind | undefined) ?? DEFAULT_VECTOR_STORE

  const create = STORES[resolved]
  if (!create) {
    throw new VectorStoreError(
      "unsupported_store",
      `Unsupported vector store "${resolved}".`
    )
  }

  return create()
}
