export type SourceKind =
  | "pdf"
  | "text"
  | "transcript"
  | "youtube"
  | "website"

export type ExtractionInput = {
  filename: string
  mimeType?: string
  bytes: Uint8Array
}

export type PdfPage = {
  pageNumber: number
  text: string
}

export type PdfExtras = {
  kind: "pdf"
  pageCount: number
  pages: PdfPage[]
}

export type TextFormat = "txt" | "md"

export type TextExtras = {
  kind: "text"
  format: TextFormat
}

export type TranscriptFormat = "vtt" | "srt"

export type TranscriptCue = {
  startMs: number
  endMs: number
  text: string
}

export type TranscriptExtras = {
  kind: "transcript"
  format: TranscriptFormat
  cues: TranscriptCue[]
}

export type ExtractedContent = {
  text: string
  kind: SourceKind
  filename: string
  extras: PdfExtras | TextExtras | TranscriptExtras
}

export interface ExtractionStrategy {
  readonly kind: SourceKind
  supports(input: ExtractionInput): boolean
  extract(input: ExtractionInput): Promise<ExtractedContent>
}

export function getFilenameExtension(filename: string): string {
  const basename = filename.split(/[/\\]/).pop() ?? filename
  const dot = basename.lastIndexOf(".")
  if (dot <= 0 || dot === basename.length - 1) return ""
  return basename.slice(dot + 1).toLowerCase()
}

export function matchesByExtensionThenMime(
  input: ExtractionInput,
  extensions: readonly string[],
  mimeTypes: readonly string[]
): boolean {
  const ext = getFilenameExtension(input.filename)
  if (ext) return extensions.includes(ext)
  const mime = input.mimeType?.split(";")[0]?.trim().toLowerCase()
  return mime ? mimeTypes.includes(mime) : false
}
