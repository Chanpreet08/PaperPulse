import { VectorStoreError } from "./errors"
import type {
  RetrieveBySourceInput,
  RetrieveSimilarInput,
  RetrievedChunk,
  StoredPoint,
  StoreEmbeddingsInput,
  VectorStore,
} from "./types"

export class PostgresVectorStore implements VectorStore {
  readonly kind = "postgres" as const

  async store(_input: StoreEmbeddingsInput): Promise<StoredPoint[]> {
    throw notImplemented("store")
  }

  async retrieveSimilar(_input: RetrieveSimilarInput): Promise<RetrievedChunk[]> {
    throw notImplemented("retrieveSimilar")
  }

  async retrieveBySource(
    _input: RetrieveBySourceInput
  ): Promise<RetrievedChunk[]> {
    throw notImplemented("retrieveBySource")
  }
}

function notImplemented(method: string): VectorStoreError {
  return new VectorStoreError(
    "not_implemented",
    `Postgres vector store ${method}() is not implemented yet.`
  )
}
