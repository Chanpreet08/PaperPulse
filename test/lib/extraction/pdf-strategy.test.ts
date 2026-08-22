import { describe, expect, test } from "bun:test"
import { join } from "node:path"

import { extractFromFile } from "@/lib/extraction"

import { encode, expectExtractionError } from "./helpers"

const helloPdf = new Uint8Array(
  await Bun.file(join(import.meta.dir, "fixtures/hello.pdf")).arrayBuffer()
)

describe("PdfStrategy", () => {
  test("extracts text and per-page extras from a PDF", async () => {
    const result = await extractFromFile({
      filename: "hello.pdf",
      bytes: helloPdf,
    })

    expect(result.kind).toBe("pdf")
    expect(result.text).toContain("Hello, world!")
    expect(result.extras).toEqual({
      kind: "pdf",
      pageCount: 1,
      pages: [{ pageNumber: 1, text: result.text }],
    })
  })

  test("throws corrupt_file for invalid PDF bytes", async () => {
    await expectExtractionError(
      { filename: "broken.pdf", bytes: encode("not a pdf") },
      "corrupt_file"
    )
  })
})
