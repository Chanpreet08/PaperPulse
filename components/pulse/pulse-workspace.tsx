"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { toast } from "sonner"

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
  PulseSource,
  PulseView,
  QueryResult,
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
  const [conversations] =
    React.useState<PulseConversation[]>(initialConversations)
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    initialSources[0]?.id ?? null
  )
  const [previewSourceId, setPreviewSourceId] = React.useState<string | null>(
    null
  )
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<QueryResult[]>([])

  const selectedSource =
    sources.find((source) => source.id === selectedSourceId) ?? null
  const previewSource =
    sources.find((source) => source.id === previewSourceId) ?? null
  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        (selectedSource?.conversationId ?? selectedSourceId)
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
    setResults([])
    setView("query")
  }

  function handleOpenPreview(sourceId: string) {
    setPreviewSourceId(sourceId)
    setSelectedSourceId(sourceId)
  }

  function handleSubmitQuery() {
    const trimmed = query.trim()
    if (!trimmed) return

    if (sources.length === 0) {
      toast.message("Add a source before asking questions.")
      return
    }

    const source = selectedSource ?? sources[0]
    setResults([
      {
        id: createSourceId(),
        title: `Preview: ${source.label}`,
        excerpt: `Query "${trimmed}" will search indexed chunks once retrieval is wired up. Open the preview panel to inspect the original source.`,
        sourceId: source.id,
      },
    ])
    setPreviewSourceId(source.id)
    toast.message("Query UI is ready — retrieval API coming next.")
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

        <div className="flex min-w-0 flex-1 flex-col">
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
                results={results}
                onOpenPreview={handleOpenPreview}
              />
              <QueryInput
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmitQuery}
                disabled={sources.length === 0}
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
