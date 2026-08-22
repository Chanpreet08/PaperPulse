import { ExtractionError } from "./errors"
import type { ExtractedContent, ExtractionInput, ExtractionStrategy } from "./types"

export class ExtractionRegistry {
  constructor(private readonly strategies: ExtractionStrategy[]) {}

  async extract(input: ExtractionInput): Promise<ExtractedContent> {
    if (input.bytes.length === 0) {
      throw new ExtractionError(
        "empty_file",
        `File "${input.filename}" is empty.`
      )
    }

    const strategy = this.strategies.find((candidate) => candidate.supports(input))
    if (!strategy) {
      throw new ExtractionError(
        "unsupported_type",
        `No extraction strategy for "${input.filename}".`
      )
    }

    return strategy.extract(input)
  }
}
