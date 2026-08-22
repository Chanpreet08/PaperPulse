export type EmbeddingErrorCode =
  | "empty_text"
  | "missing_api_key"
  | "embed_failed"

export class EmbeddingError extends Error {
  readonly code: EmbeddingErrorCode

  constructor(
    code: EmbeddingErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "EmbeddingError"
    this.code = code
  }
}
