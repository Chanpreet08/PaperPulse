export type VectorStoreErrorCode =
  | "empty_chunks"
  | "invalid_vector"
  | "invalid_query"
  | "missing_config"
  | "unsupported_store"
  | "not_implemented"
  | "upsert_failed"
  | "retrieve_failed"

export class VectorStoreError extends Error {
  readonly code: VectorStoreErrorCode

  constructor(
    code: VectorStoreErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "VectorStoreError"
    this.code = code
  }
}
