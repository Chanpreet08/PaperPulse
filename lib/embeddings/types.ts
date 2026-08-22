export type EmbeddedChunk = {
  index: number
  text: string
  embedding: number[]
}

export type EmbedOptions = {
  model?: string
  maxChunkChars?: number
  overlapChars?: number
}

export type ChunkOptions = {
  maxChunkChars?: number
  overlapChars?: number
}

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
export const DEFAULT_MAX_CHUNK_CHARS = 2000
export const DEFAULT_OVERLAP_CHARS = 200
export const EMBED_BATCH_SIZE = 100
