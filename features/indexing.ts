import "server-only"

import path from "node:path"

import { embedText } from "@/lib/embeddings"
import type { EmbedOptions } from "@/lib/embeddings/types"
import { extractFromFile, extractFromUrl } from "@/lib/extraction"
import type { SourceKind } from "@/lib/extraction/types"
import { storeEmbeddings } from "@/lib/vector-store"
import type { StoredPoint, VectorStoreKind } from "@/lib/vector-store/types"

export type IndexErrorCode =
  | "invalid_path"
  | "file_not_found"
  | "missing_config"
  | "invalid_query"

export class IndexError extends Error {
  readonly code: IndexErrorCode

  constructor(
    code: IndexErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "IndexError"
    this.code = code
  }
}

export type IndexSourceInput =
  | { type: "file"; filename: string; mimeType?: string; bytes: Uint8Array }
  | { type: "url"; url: string }

export type IndexOptions = {
  embed?: EmbedOptions
  collection?: string
  vectorStore?: VectorStoreKind
}

export type IndexResult = {
  source: string
  kind: SourceKind
  chunkCount: number
  points: StoredPoint[]
}

const DEFAULT_INDEX_FILES_DIR = "./uploads"

function getIndexFilesDir(): string {
  const configured = process.env.INDEX_FILES_DIR?.trim()
  return configured || DEFAULT_INDEX_FILES_DIR
}

export function resolveSafePath(filePath: string): string {
  const configured = getIndexFilesDir()
  const base = path.isAbsolute(configured)
    ? path.resolve(/*turbopackIgnore: true*/ configured)
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured)
  const resolved = path.resolve(/*turbopackIgnore: true*/ base, filePath)
  const relative = path.relative(base, resolved)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new IndexError(
      "invalid_path",
      `Path escapes INDEX_FILES_DIR: "${filePath}".`
    )
  }

  return resolved
}

export async function indexSource(
  input: IndexSourceInput,
  options?: IndexOptions
): Promise<IndexResult> {
  const extracted =
    input.type === "file"
      ? await extractFromFile({
          filename: input.filename,
          mimeType: input.mimeType,
          bytes: input.bytes,
        })
      : await extractFromUrl(input.url)
  
  const chunks = await embedText(extracted.text, options?.embed)
  const points = await storeEmbeddings(
    {
      chunks,
      source: {
        filename: extracted.filename,
        kind: extracted.kind,
      },
      collection: options?.collection,
    },
    options?.vectorStore
  )

  return {
    source: extracted.filename,
    kind: extracted.kind,
    chunkCount: chunks.length,
    points,
  }
}
