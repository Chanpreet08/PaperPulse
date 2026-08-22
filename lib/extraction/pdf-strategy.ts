import { extractText, getDocumentProxy } from "unpdf"

import { ExtractionError } from "./errors"
import {
  matchesByExtensionThenMime,
  type ExtractedContent,
  type ExtractionInput,
  type ExtractionStrategy,
} from "./types"

const EXTENSIONS = ["pdf"] as const
const MIME_TYPES = ["application/pdf"] as const

export class PdfStrategy implements ExtractionStrategy {
  readonly kind = "pdf" as const

  supports(input: ExtractionInput): boolean {
    return matchesByExtensionThenMime(input, EXTENSIONS, MIME_TYPES)
  }

  async extract(input: ExtractionInput): Promise<ExtractedContent> {
    try {
      const pdf = await getDocumentProxy(input.bytes)
      const { totalPages, text } = await extractText(pdf, { mergePages: false })
      const pages = text.map((pageText, index) => ({
        pageNumber: index + 1,
        text: pageText,
      }))

      return {
        text: text.join("\n\n"),
        kind: "pdf",
        filename: input.filename,
        extras: {
          kind: "pdf",
          pageCount: totalPages,
          pages,
        },
      }
    } catch (error) {
      if (error instanceof ExtractionError) throw error
      throw new ExtractionError(
        "corrupt_file",
        `Could not parse PDF "${input.filename}".`,
        { cause: error }
      )
    }
  }
}
