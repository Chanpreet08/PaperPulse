export type IndexJobAccepted = {
  id: string
  status: "indexing" | "indexed" | "error"
  label: string
  type: string
  kind: string | null
  chunkCount: number | null
  errorMessage: string | null
  source: string
}

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

async function readJson(
  response: Response
): Promise<IndexJobAccepted | { error?: string } | null> {
  return (await response.json().catch(() => null)) as
    | IndexJobAccepted
    | { error?: string }
    | null
}

function errorMessage(
  payload: IndexJobAccepted | { error?: string } | null,
  fallback: string
): string {
  if (payload && "error" in payload && payload.error) return payload.error
  return fallback
}

export async function getIndexJobStatus(
  jobId: string
): Promise<IndexJobAccepted> {
  const response = await fetch(`/api/index/${jobId}`)
  const payload = await readJson(response)

  if (!response.ok) {
    throw new Error(errorMessage(payload, "Failed to fetch index job status."))
  }

  if (!payload || !("id" in payload) || !("status" in payload)) {
    throw new Error("Unexpected response from index job status API.")
  }

  return payload
}

export async function waitForIndexJob(
  jobId: string
): Promise<IndexJobAccepted> {
  const started = Date.now()

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const job = await getIndexJobStatus(jobId)
    if (job.status === "indexed") return job
    if (job.status === "error") {
      throw new Error(job.errorMessage || "Indexing failed.")
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error("Timed out waiting for indexing to finish.")
}

export async function indexSourceOnServer(
  input: { file: File } | { url: string }
): Promise<IndexJobAccepted> {
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

  const payload = await readJson(response)

  if (!response.ok) {
    throw new Error(errorMessage(payload, "Failed to start indexing."))
  }

  if (!payload || !("id" in payload) || !("status" in payload)) {
    throw new Error("Unexpected response from indexing API.")
  }

  if (response.status === 202 || payload.status === "indexing") {
    return waitForIndexJob(payload.id)
  }

  if (payload.status === "error") {
    throw new Error(payload.errorMessage || "Indexing failed.")
  }

  return payload
}
