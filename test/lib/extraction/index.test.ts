import { describe, test } from "bun:test"

import { encode, expectExtractionError } from "./helpers"

describe("extractFromFile", () => {
  test("throws empty_file for a zero-byte input", async () => {
    await expectExtractionError(
      { filename: "notes.txt", bytes: new Uint8Array() },
      "empty_file"
    )
  })

  test("throws unsupported_type for an unknown extension", async () => {
    await expectExtractionError(
      { filename: "slides.docx", bytes: encode("placeholder") },
      "unsupported_type"
    )
  })
})
