import { ExtractionError } from "./errors"
import {
  getFilenameExtension,
  matchesByExtensionThenMime,
  type ExtractedContent,
  type ExtractionInput,
  type ExtractionStrategy,
  type TextFormat,
} from "./types"

const EXTENSIONS = ["txt", "md"] as const
const MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown"] as const

function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8").decode(bytes)
  return text.startsWith("\uFEFF") ? text.slice(1) : text
}

function resolveTextFormat(input: ExtractionInput): TextFormat {
  const ext = getFilenameExtension(input.filename)
  if (ext === "md") return "md"
  if (ext === "txt") return "txt"
  const mime = input.mimeType?.split(";")[0]?.trim().toLowerCase()
  if (mime === "text/markdown" || mime === "text/x-markdown") return "md"
  return "txt"
}

export class TextStrategy implements ExtractionStrategy {
  readonly kind = "text" as const

  supports(input: ExtractionInput): boolean {
    return matchesByExtensionThenMime(input, EXTENSIONS, MIME_TYPES)
  }

  async extract(input: ExtractionInput): Promise<ExtractedContent> {
    try {
      const text = decodeUtf8(input.bytes)
      return {
        text,
        kind: "text",
        filename: input.filename,
        extras: {
          kind: "text",
          format: resolveTextFormat(input),
        },
      }
    } catch (error) {
      if (error instanceof ExtractionError) throw error
      throw new ExtractionError(
        "parse_error",
        `Could not read text file "${input.filename}".`,
        { cause: error }
      )
    }
  }
}
