"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { toast } from "sonner"

import { askConversation } from "@/components/pulse/ask-query"
import { indexSourceOnServer } from "@/components/pulse/index-source"
import {
  QueryInput,
  QueryWorkspace,
  QueryWorkspaceHeader,
} from "@/components/pulse/query-workspace"
import { SourcePicker } from "@/components/pulse/source-picker"
import { SourcePreview } from "@/components/pulse/source-preview"
import { SourceSidebar } from "@/components/pulse/source-sidebar"
import {
  getFileSourceType,
  getUrlSourceType,
} from "@/components/pulse/source-utils"
import type {
  PulseConversation,
  PulseMessage,
  PulseSource,
  PulseView,
} from "@/components/pulse/types"
import { ThemeToggle } from "@/components/theme-toggle"

function createSourceId() {
  return crypto.randomUUID()
}

type PulseWorkspaceProps = {
  initialConversations?: PulseConversation[]
  initialSources?: PulseSource[]
}

export function PulseWorkspace({
  initialConversations = [],
  initialSources = [],
}: PulseWorkspaceProps) {
  const [view, setView] = React.useState<PulseView>("query")
  const [sources, setSources] = React.useState<PulseSource[]>(initialSources)
  const [conversations, setConversations] =
    React.useState<PulseConversation[]>(initialConversations)
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    initialSources[0]?.id ?? null
  )
  const [previewSourceId, setPreviewSourceId] = React.useState<string | null>(
    null
  )
  const [query, setQuery] = React.useState("")
  const [isAsking, setIsAsking] = React.useState(false)
  const [thinkingStatus, setThinkingStatus] = React.useState<
    "thinking" | "retrieving" | "generating" | null
  >(null)

  const selectedSource =
    sources.find((source) => source.id === selectedSourceId) ?? null
  const previewSource =
    sources.find((source) => source.id === previewSourceId) ?? null
  const selectedConversationId =
    selectedSource?.conversationId ?? selectedSourceId
  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId
    ) ?? null

  const updateSource = React.useCallback(
    (id: string, patch: Partial<PulseSource>) => {
      setSources((current) =>
        current.map((source) =>
          source.id === id ? { ...source, ...patch } : source
        )
      )
    },
    []
  )

  function appendMessages(
    conversationId: string,
    nextMessages: PulseMessage[]
  ) {
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        return {
          ...conversation,
          messages: [...conversation.messages, ...nextMessages],
          lastMessageAt:
            nextMessages[nextMessages.length - 1]?.createdAt ??
            conversation.lastMessageAt,
        }
      })
    )
  }

  async function runIndexing(source: PulseSource) {
    try {
      const response =
        source.file != null
          ? await indexSourceOnServer({ file: source.file })
          : source.url != null
            ? await indexSourceOnServer({ url: source.url })
            : null

      if (!response) {
        throw new Error("Source is missing file or URL data.")
      }

      updateSource(source.id, {
        jobId: response.id,
        status: "indexed",
        chunkCount: response.chunkCount ?? undefined,
        errorMessage: undefined,
      })
      toast.success(`Indexed ${response.source}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to index source."
      updateSource(source.id, {
        status: "error",
        errorMessage: message,
      })
      toast.error(message)
    }
  }

  function queueSource(source: PulseSource) {
    setSources((current) => [source, ...current])
    setSelectedSourceId(source.id)
    setView("query")
    void runIndexing(source)
  }

  function handlePickFile(file: File) {
    queueSource({
      id: createSourceId(),
      type: getFileSourceType(file.name),
      label: file.name,
      status: "indexing",
      file,
    })
  }

  function handlePickUrl(url: string) {
    queueSource({
      id: createSourceId(),
      type: getUrlSourceType(url),
      label: url,
      status: "indexing",
      url,
    })
  }

  function handleSelectSource(id: string) {
    setSelectedSourceId(id)
    setView("query")
  }

  function handleOpenPreview(sourceId: string) {
    setPreviewSourceId(sourceId)
    setSelectedSourceId(sourceId)
  }

  async function handleSubmitQuery() {
    const trimmed = query.trim()
    if (!trimmed || isAsking) return

    if (!selectedConversation) {
      toast.message(
        "Select an indexed conversation, or refresh after indexing finishes."
      )
      return
    }

    const conversationId = selectedConversation.id
    setIsAsking(true)
    setThinkingStatus("thinking")
    setQuery("")

    const optimisticUserId = createSourceId()
    const optimisticAssistantId = createSourceId()

    const optimisticUser: PulseMessage = {
      id: optimisticUserId,
      conversationId,
      role: "USER",
      status: "PENDING",
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    const optimisticAssistant: PulseMessage = {
      id: optimisticAssistantId,
      conversationId,
      role: "ASSISTANT",
      status: "PENDING",
      content: "",
      createdAt: new Date().toISOString(),
    }
    appendMessages(conversationId, [optimisticUser, optimisticAssistant])

    try {
      await askConversation(
        {
          conversationId,
          message: trimmed,
        },
        {
          onStatus: (status) => {
            setThinkingStatus(status)
          },
          onUserMessage: (message) => {
            setConversations((current) =>
              current.map((conversation) => {
                if (conversation.id !== conversationId) return conversation
                return {
                  ...conversation,
                  messages: conversation.messages.map((item) =>
                    item.id === optimisticUserId ? message : item
                  ),
                }
              })
            )
          },
          onDelta: (text) => {
            setThinkingStatus(null)
            setConversations((current) =>
              current.map((conversation) => {
                if (conversation.id !== conversationId) return conversation
                return {
                  ...conversation,
                  messages: conversation.messages.map((item) =>
                    item.id === optimisticAssistantId
                      ? {
                          ...item,
                          content: `${item.content}${text}`,
                          status: "PENDING",
                        }
                      : item
                  ),
                }
              })
            )
          },
          onDone: ({ assistantMessage }) => {
            setConversations((current) =>
              current.map((conversation) => {
                if (conversation.id !== conversationId) return conversation
                return {
                  ...conversation,
                  messages: conversation.messages.map((item) =>
                    item.id === optimisticAssistantId ||
                    item.id === assistantMessage.id
                      ? assistantMessage
                      : item
                  ),
                  lastMessageAt: assistantMessage.createdAt,
                }
              })
            )
          },
        }
      )
    } catch (error) {
      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation
          return {
            ...conversation,
            messages: conversation.messages.filter(
              (message) =>
                message.id !== optimisticUserId &&
                message.id !== optimisticAssistantId
            ),
          }
        })
      )
      const message =
        error instanceof Error ? error.message : "Failed to answer query."
      toast.error(message)
      setQuery(trimmed)
    } finally {
      setIsAsking(false)
      setThinkingStatus(null)
    }
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <SourceSidebar
          sources={sources}
          selectedSourceId={selectedSourceId}
          onAddSource={() => setView("add-source")}
          onSelectSource={handleSelectSource}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {view === "add-source" ? (
            <SourcePicker
              onBack={() => setView("query")}
              onPickFile={handlePickFile}
              onPickUrl={handlePickUrl}
            />
          ) : (
            <>
              <QueryWorkspaceHeader
                title={selectedSource?.label ?? "Workspace"}
                previewOpen={previewSource != null}
                onClosePreview={() => setPreviewSourceId(null)}
              />
              <QueryWorkspace
                sources={sources}
                selectedSource={selectedSource}
                messages={selectedConversation?.messages ?? []}
                isAsking={isAsking}
                thinkingStatus={thinkingStatus}
                onOpenPreview={handleOpenPreview}
              />
              <QueryInput
                value={query}
                onChange={setQuery}
                onSubmit={() => {
                  void handleSubmitQuery()
                }}
                disabled={!selectedConversation || isAsking}
                placeholder={
                  selectedConversation
                    ? "Ask a question about this source..."
                    : "Select an indexed conversation to ask questions"
                }
              />
            </>
          )}
        </div>

        {view === "query" && previewSource && (
          <SourcePreview
            source={previewSource}
            onClose={() => setPreviewSourceId(null)}
          />
        )}
      </div>

      <div className="pointer-events-none absolute top-4 right-4 z-50 flex items-center gap-2">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
        <div className="pointer-events-auto">
          <UserButton />
        </div>
      </div>
    </div>
  )
}
