import "server-only"

import { chunkText } from "./chunk"
import { EmbeddingError } from "./errors"
import { embedChunks } from "./openai-embedder"
import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_MAX_CHUNK_CHARS,
  DEFAULT_OVERLAP_CHARS,
  type EmbeddedChunk,
  type EmbedOptions,
} from "./types"

export async function embedText(
  text: string,
  options?: EmbedOptions
): Promise<EmbeddedChunk[]> {
  const chunks = await chunkText(text, {
    maxChunkChars: options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS,
    overlapChars: options?.overlapChars ?? DEFAULT_OVERLAP_CHARS,
  })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new EmbeddingError(
      "missing_api_key",
      "OPENAI_API_KEY is not set."
    )
  }

  const model =
    options?.model ??
    process.env.OPENAI_EMBEDDING_MODEL ??
    DEFAULT_EMBEDDING_MODEL

  try {
    const vectors = await embedChunks(chunks, model, apiKey)
    if (vectors.length !== chunks.length) {
      throw new EmbeddingError(
        "embed_failed",
        "Embedding count did not match chunk count."
      )
    }

    return chunks.map((chunk, index) => ({
      index,
      text: chunk,
      embedding: vectors[index],
    }))
  } catch (error) {
    if (error instanceof EmbeddingError) throw error
    throw new EmbeddingError("embed_failed", "Failed to create embeddings.", {
      cause: error,
    })
  }
}

export { chunkText } from "./chunk"
export { EmbeddingError } from "./errors"
export type { EmbeddedChunk, EmbedOptions, ChunkOptions } from "./types"
