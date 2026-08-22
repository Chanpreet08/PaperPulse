import { expect } from "bun:test"

import type { ExtractionErrorCode } from "@/lib/extraction/errors"
import {
  ExtractionError,
  extractFromFile,
  type ExtractionInput,
} from "@/lib/extraction"

export const encode = (text: string) => new TextEncoder().encode(text)

export async function expectExtractionError(
  input: ExtractionInput,
  code: ExtractionErrorCode
) {
  try {
    await extractFromFile(input)
    throw new Error(`Expected ExtractionError with code "${code}"`)
  } catch (error) {
    expect(error).toBeInstanceOf(ExtractionError)
    expect((error as ExtractionError).code).toBe(code)
  }
}
