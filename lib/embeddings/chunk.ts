import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

import { EmbeddingError } from "./errors"
import {
  DEFAULT_MAX_CHUNK_CHARS,
  DEFAULT_OVERLAP_CHARS,
  type ChunkOptions,
} from "./types"

const SEPARATORS = ["\n\n", "\n", ". ", " ", ""]

export async function chunkText(
  text: string,
  options?: ChunkOptions
): Promise<string[]> {
  const maxChunkChars = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
  const overlapChars = Math.min(
    options?.overlapChars ?? DEFAULT_OVERLAP_CHARS,
    Math.max(0, maxChunkChars - 1)
  )

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!normalized) {
    throw new EmbeddingError("empty_text", "Cannot embed empty text.")
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChunkChars,
    chunkOverlap: overlapChars,
    separators: SEPARATORS,
  })

  const chunks = (await splitter.splitText(normalized))
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (chunks.length === 0) {
    throw new EmbeddingError("empty_text", "Cannot embed empty text.")
  }

  return chunks
}
