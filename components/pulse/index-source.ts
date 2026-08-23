type IndexApiSuccess = {
  source: string
  kind: string
  chunkCount: number
  points: Array<{ id: string; index: number }>
}

export async function indexSourceOnServer(
  input: { file: File } | { url: string }
): Promise<IndexApiSuccess> {
  const formData = new FormData()

  if ("file" in input) {
    formData.append("file", input.file)
  } else {
    formData.append("url", input.url)
  }

  const response = await fetch("/api/index", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as
    | IndexApiSuccess
    | { error?: string }
    | null

  if (!response.ok) {
    const message =
      payload && "error" in payload && payload.error
        ? payload.error
        : "Failed to index source."
    throw new Error(message)
  }

  if (!payload || !("source" in payload)) {
    throw new Error("Unexpected response from indexing API.")
  }

  return payload
}
