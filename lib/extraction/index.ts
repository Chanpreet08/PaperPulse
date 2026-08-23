import "server-only"

import { PdfStrategy } from "./pdf-strategy"
import { ExtractionRegistry } from "./registry"
import { TextStrategy } from "./text-strategy"
import { TranscriptStrategy } from "./transcript-strategy"
import type { ExtractedContent, ExtractionInput } from "./types"

const registry = new ExtractionRegistry([
  new PdfStrategy(),
  new TranscriptStrategy(),
  new TextStrategy(),
])

export async function extractFromFile(
  input: ExtractionInput
): Promise<ExtractedContent> {
  return registry.extract(input)
}

export { classifyUrl, extractFromUrl } from "./url"
export { ExtractionError } from "./errors"
export { ExtractionRegistry } from "./registry"
export { PdfStrategy } from "./pdf-strategy"
export { TextStrategy } from "./text-strategy"
export { TranscriptStrategy } from "./transcript-strategy"
export type {
  ExtractedContent,
  ExtractionInput,
  ExtractionStrategy,
  PdfExtras,
  PdfPage,
  SourceKind,
  TextExtras,
  TextFormat,
  TranscriptCue,
  TranscriptExtras,
  TranscriptFormat,
} from "./types"
