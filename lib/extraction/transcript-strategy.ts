import { parseSync, type NodeCue } from "subtitle"

import { ExtractionError } from "./errors"
import {
  getFilenameExtension,
  matchesByExtensionThenMime,
  type ExtractedContent,
  type ExtractionInput,
  type ExtractionStrategy,
  type TranscriptCue,
  type TranscriptFormat,
} from "./types"

const EXTENSIONS = ["vtt", "srt"] as const
const MIME_TYPES = ["text/vtt", "application/x-subrip", "text/srt"] as const

function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8").decode(bytes)
  return text.startsWith("\uFEFF") ? text.slice(1) : text
}

function resolveTranscriptFormat(input: ExtractionInput): TranscriptFormat {
  const ext = getFilenameExtension(input.filename)
  if (ext === "srt") return "srt"
  if (ext === "vtt") return "vtt"
  const mime = input.mimeType?.split(";")[0]?.trim().toLowerCase()
  if (mime === "application/x-subrip" || mime === "text/srt") return "srt"
  return "vtt"
}

function parseTranscript(source: string): TranscriptCue[] {
  return parseSync(source)
    .filter((node): node is NodeCue => node.type === "cue")
    .map((node) => ({
      startMs: node.data.start,
      endMs: node.data.end,
      text: node.data.text.trim(),
    }))
    .filter((cue) => cue.text.length > 0)
}

export class TranscriptStrategy implements ExtractionStrategy {
  readonly kind = "transcript" as const

  supports(input: ExtractionInput): boolean {
    return matchesByExtensionThenMime(input, EXTENSIONS, MIME_TYPES)
  }

  async extract(input: ExtractionInput): Promise<ExtractedContent> {
    try {
      const format = resolveTranscriptFormat(input)
      const cues = parseTranscript(decodeUtf8(input.bytes))

      if (cues.length === 0) {
        throw new ExtractionError(
          "parse_error",
          `No cues found in transcript "${input.filename}".`
        )
      }

      return {
        text: cues.map((cue) => cue.text).join("\n"),
        kind: "transcript",
        filename: input.filename,
        extras: {
          kind: "transcript",
          format,
          cues,
        },
      }
    } catch (error) {
      if (error instanceof ExtractionError) throw error
      throw new ExtractionError(
        "parse_error",
        `Could not parse transcript "${input.filename}".`,
        { cause: error }
      )
    }
  }
}
