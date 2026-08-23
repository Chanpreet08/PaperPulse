export type ExtractionErrorCode =
  | "unsupported_type"
  | "empty_file"
  | "corrupt_file"
  | "parse_error"
  | "not_implemented"

export class ExtractionError extends Error {
  readonly code: ExtractionErrorCode

  constructor(
    code: ExtractionErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "ExtractionError"
    this.code = code
  }
}
