import { ExtractionError } from "./errors"
import type { SourceKind } from "./types"

export function classifyUrl(url: string): SourceKind {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) {
    return "youtube"
  }
  return "website"
}

export async function extractFromUrl(url: string): Promise<never> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new ExtractionError("parse_error", "URL must not be empty.")
  }

  try {
    new URL(trimmed)
  } catch {
    throw new ExtractionError("parse_error", `Invalid URL "${trimmed}".`)
  }

  const kind = classifyUrl(trimmed)
  throw new ExtractionError(
    "not_implemented",
    `URL extraction for "${kind}" sources is not implemented yet.`
  )
}
