import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import {
  IndexError,
  indexSource,
} from "@/features/indexing"
import { EmbeddingError } from "@/lib/embeddings"
import { ExtractionError } from "@/lib/extraction"
import { VectorStoreError } from "@/lib/vector-store"

function errorResponse(error: unknown): NextResponse {
  if (error instanceof IndexError) {
    switch (error.code) {
      case "invalid_path":
      case "invalid_query":
        return NextResponse.json({ error: error.message }, { status: 400 })
      case "file_not_found":
        return NextResponse.json({ error: error.message }, { status: 404 })
      case "missing_config":
        return NextResponse.json({ error: error.message }, { status: 503 })
    }
  }

  if (error instanceof ExtractionError) {
    switch (error.code) {
      case "unsupported_type":
        return NextResponse.json({ error: error.message }, { status: 415 })
      case "empty_file":
        return NextResponse.json({ error: error.message }, { status: 422 })
      case "not_implemented":
        return NextResponse.json({ error: error.message }, { status: 501 })
      case "corrupt_file":
      case "parse_error":
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  if (error instanceof EmbeddingError) {
    switch (error.code) {
      case "empty_text":
        return NextResponse.json({ error: error.message }, { status: 422 })
      case "missing_api_key":
        return NextResponse.json({ error: error.message }, { status: 503 })
    }
  }

  if (error instanceof VectorStoreError) {
    switch (error.code) {
      case "empty_chunks":
      case "invalid_vector":
        return NextResponse.json({ error: error.message }, { status: 422 })
      case "invalid_query":
        return NextResponse.json({ error: error.message }, { status: 400 })
      case "missing_config":
        return NextResponse.json({ error: error.message }, { status: 503 })
    }
  }

  const message =
    error instanceof Error ? error.message : "Internal server error."
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function POST(request: Request): Promise<NextResponse> {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Request body must be multipart/form-data." },
      { status: 400 }
    )
  }

  const fileField = formData.get("file")
  const urlField = formData.get("url")

  const hasFile = fileField instanceof File
  const url = typeof urlField === "string" ? urlField.trim() : ""
  const hasUrl = url.length > 0

  if (hasFile && hasUrl) {
    return NextResponse.json(
      { error: "Provide either a file or a url, not both." },
      { status: 400 }
    )
  }

  if (!hasFile && !hasUrl) {
    return NextResponse.json(
      { error: "Provide a file or a url to index." },
      { status: 400 }
    )
  }

  if (hasFile && fileField.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 })
  }

  try {
    const result = hasFile
      ? await indexSource({
          type: "file",
          filename: fileField.name,
          mimeType: fileField.type || undefined,
          bytes: new Uint8Array(await fileField.arrayBuffer()),
        })
      : await indexSource({ type: "url", url })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
