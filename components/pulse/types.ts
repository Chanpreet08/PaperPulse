export type SourceType = "pdf" | "text" | "transcript" | "youtube" | "website"

export type SourceStatus = "indexing" | "indexed" | "error"

export type PulseSource = {
  id: string
  type: SourceType
  label: string
  status: SourceStatus
  jobId?: string
  file?: File
  url?: string
  chunkCount?: number
  errorMessage?: string
}

export type PulseView = "query" | "add-source"

export type QueryResult = {
  id: string
  title: string
  excerpt: string
  sourceId: string
}
