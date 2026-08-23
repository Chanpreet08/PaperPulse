"use client"

import * as React from "react"
import { FileText, Search, X } from "lucide-react"

import { sourceTypeLabel } from "@/components/pulse/source-utils"
import type { PulseSource, QueryResult } from "@/components/pulse/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const suggestedPrompts = [
  "Summarize the key findings",
  "What methods were used?",
  "List open questions",
  "Compare across sources",
]

type QueryWorkspaceProps = {
  sources: PulseSource[]
  selectedSource: PulseSource | null
  results: QueryResult[]
  onOpenPreview: (sourceId: string) => void
}

export function QueryWorkspace({
  sources,
  selectedSource,
  results,
  onOpenPreview,
}: QueryWorkspaceProps) {
  const hasSources = sources.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
          <div className="min-h-[280px] rounded-2xl border border-border bg-card p-6 shadow-sm">
            {!hasSources ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium">No sources indexed yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Add PDFs, text files, transcripts, or links from the sidebar
                    to start asking questions.
                  </p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active source
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {selectedSource?.label ?? "Your library"}
                  </h2>
                  {selectedSource && (
                    <p className="text-sm text-muted-foreground">
                      {sourceTypeLabel(selectedSource.type)}
                      {selectedSource.chunkCount
                        ? ` · ${selectedSource.chunkCount} indexed chunks`
                        : ""}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Type a query below to search across your indexed content.
                  Retrieval is coming soon — the layout is ready for results.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Results</h2>
                <div className="space-y-3">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => onOpenPreview(result.sourceId)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-ring hover:bg-muted/40"
                    >
                      <p className="text-sm font-medium">{result.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {result.excerpt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasSources && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    const source = selectedSource ?? sources[0]
                    if (source) onOpenPreview(source.id)
                  }}
                  className="rounded-xl border border-border bg-muted/30 px-4 py-5 text-left text-sm font-medium transition-colors hover:border-ring hover:bg-muted/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

type QueryInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: QueryInputProps) {
  return (
    <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <form
        className="mx-auto flex max-w-5xl items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            placeholder="Type a query here..."
            className={cn(
              "h-11 w-full rounded-2xl border border-input bg-background pr-4 pl-10 text-sm shadow-sm outline-none transition-colors",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>
        <Button type="submit" disabled={disabled || !value.trim()}>
          Ask
        </Button>
      </form>
    </div>
  )
}

export function QueryWorkspaceHeader({
  title,
  onClosePreview,
  previewOpen,
}: {
  title: string
  previewOpen: boolean
  onClosePreview?: () => void
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Paper Pulse
        </p>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {previewOpen && onClosePreview && (
        <Button variant="outline" size="sm" onClick={onClosePreview}>
          <X className="size-4" />
          Close preview
        </Button>
      )}
    </header>
  )
}
