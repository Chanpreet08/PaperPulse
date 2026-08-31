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
  conversationId?: string
}

export type PulseMessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL"

export type PulseMessageStatus = "PENDING" | "COMPLETED" | "ERROR"

export type PulseMessage = {
  id: string
  conversationId: string
  role: PulseMessageRole
  status: PulseMessageStatus
  content: string
  createdAt: string
}

export type PulseConversation = {
  id: string
  title: string
  model: string
  isPinned: boolean
  isArchived: boolean
  lastMessageAt: string
  createdAt: string
  messages: PulseMessage[]
}

export type PulseView = "query" | "add-source"
