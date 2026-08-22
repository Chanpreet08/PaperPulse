import { describe, expect, test } from "bun:test"

import { extractFromFile } from "@/lib/extraction"

import { encode } from "./helpers"

describe("TextStrategy", () => {
  test("extracts a txt file as UTF-8 text", async () => {
    const result = await extractFromFile({
      filename: "notes.txt",
      bytes: encode("hello paper pulse"),
    })

    expect(result).toEqual({
      text: "hello paper pulse",
      kind: "text",
      filename: "notes.txt",
      extras: { kind: "text", format: "txt" },
    })
  })

  test("extracts markdown and strips a leading BOM", async () => {
    const result = await extractFromFile({
      filename: "readme.md",
      bytes: encode("\uFEFF# Title"),
    })

    expect(result).toEqual({
      text: "# Title",
      kind: "text",
      filename: "readme.md",
      extras: { kind: "text", format: "md" },
    })
  })

  test("falls back to MIME when the filename has no extension", async () => {
    const result = await extractFromFile({
      filename: "untitled",
      mimeType: "text/markdown; charset=utf-8",
      bytes: encode("notes"),
    })

    expect(result.kind).toBe("text")
    expect(result.extras).toEqual({ kind: "text", format: "md" })
  })
})
