import type { EmbeddedChunk } from "@/lib/embeddings/types"
import type { SourceKind } from "@/lib/extraction/types"

export type VectorStoreKind = "qdrant" | "postgres"

export type StoreEmbeddingsInput = {
  chunks: EmbeddedChunk[]
  source: {
    filename: string
    kind: SourceKind
    conversationId: string
  }
  collection?: string
}

export type RetrieveSimilarInput = {
  embedding: number[]
  limit?: number
  filter?: {
    conversationId?: string
    filename?: string
    kind?: SourceKind
  }
  collection?: string
}

export type RetrieveBySourceInput = {
  filename: string
  kind?: SourceKind
  conversationId?: string
  collection?: string
}

export type StoredPoint = {
  id: string
  index: number
}

export type RetrievedChunk = {
  id: string
  index: number
  text: string
  filename: string
  kind: SourceKind
  conversationId?: string
  score?: number
  embedding: number[]
}

export interface VectorStore {
  readonly kind: VectorStoreKind
  store(input: StoreEmbeddingsInput): Promise<StoredPoint[]>
  retrieveSimilar(input: RetrieveSimilarInput): Promise<RetrievedChunk[]>
  retrieveBySource(input: RetrieveBySourceInput): Promise<RetrievedChunk[]>
}

export const DEFAULT_VECTOR_STORE: VectorStoreKind = "qdrant"
export const DEFAULT_COLLECTION = "paper-pulse"
export const DEFAULT_SIMILAR_LIMIT = 5
export const SCROLL_PAGE_SIZE = 100
