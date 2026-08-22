import { describe, expect, test } from "bun:test"

import { extractFromFile } from "@/lib/extraction"

import { encode, expectExtractionError } from "./helpers"

describe("TranscriptStrategy", () => {
  test("extracts VTT cues with timestamps and concatenated text", async () => {
    const result = await extractFromFile({
      filename: "talk.vtt",
      bytes: encode(`WEBVTT

NOTE this is a note

1
00:00:00.000 --> 00:00:01.500
Hello world

00:00:02.000 --> 00:00:03.000 align:start
Second cue
`),
    })

    expect(result.kind).toBe("transcript")
    expect(result.text).toBe("Hello world\nSecond cue")
    expect(result.extras).toEqual({
      kind: "transcript",
      format: "vtt",
      cues: [
        { startMs: 0, endMs: 1500, text: "Hello world" },
        { startMs: 2000, endMs: 3000, text: "Second cue" },
      ],
    })
  })

  test("extracts SRT cues using comma timestamps", async () => {
    const result = await extractFromFile({
      filename: "talk.srt",
      bytes: encode(`1
00:00:00,000 --> 00:00:02,000
Line one
Line two

2
00:01:00,500 --> 00:01:02,000
Later
`),
    })

    expect(result.kind).toBe("transcript")
    expect(result.text).toBe("Line one\nLine two\nLater")
    expect(result.extras).toEqual({
      kind: "transcript",
      format: "srt",
      cues: [
        { startMs: 0, endMs: 2000, text: "Line one\nLine two" },
        { startMs: 60500, endMs: 62000, text: "Later" },
      ],
    })
  })

  test("throws parse_error when a transcript has no cues", async () => {
    await expectExtractionError(
      { filename: "empty.vtt", bytes: encode("WEBVTT\n\nnot a cue") },
      "parse_error"
    )
  })
})
