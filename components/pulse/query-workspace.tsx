"use client"

import { FileText, Search, X } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { sourceTypeLabel } from "@/components/pulse/source-utils"
import type { PulseMessage, PulseSource } from "@/components/pulse/types"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const suggestedPrompts = [
  "Summarize the key findings",
  "What methods were used?",
  "List open questions",
  "Compare across sources",
]

const thinkingLabels = {
  thinking: "Thinking…",
  retrieving: "Searching sources…",
  generating: "Writing answer…",
} as const

type ThinkingStatus = keyof typeof thinkingLabels

type QueryWorkspaceProps = {
  sources: PulseSource[]
  selectedSource: PulseSource | null
  messages: PulseMessage[]
  isAsking?: boolean
  thinkingStatus?: ThinkingStatus | null
  onOpenPreview: (sourceId: string) => void
}

function ChatMessage({
  message,
  thinkingStatus,
}: {
  message: PulseMessage
  thinkingStatus?: ThinkingStatus | null
}) {
  const isUser = message.role === "USER"
  const isStreamingAssistant =
    !isUser && message.status === "PENDING" && message.content.length > 0
  const isThinkingAssistant =
    !isUser && message.status === "PENDING" && message.content.length === 0

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "w-fit max-w-[min(85%,36rem)] rounded-3xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground",
          message.status === "PENDING" && isUser && "opacity-70"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : isThinkingAssistant ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="size-3.5" />
            <span>
              {thinkingStatus ? thinkingLabels[thinkingStatus] : "Thinking…"}
            </span>
          </div>
        ) : (
          <div
            className={cn(
              "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
              "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
              "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
              "[&_strong]:font-semibold",
              "[&_a]:underline [&_a]:underline-offset-2",
              "[&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]"
            )}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreamingAssistant && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/70 align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function QueryWorkspace({
  sources,
  selectedSource,
  messages,
  thinkingStatus = null,
}: QueryWorkspaceProps) {
  const hasSources = sources.length > 0
  const hasMessages = messages.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pt-6 pb-8">
          {!hasSources ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
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
          ) : hasMessages ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Conversation
                </p>
                <h2 className="text-xl font-semibold tracking-tight">
                  {selectedSource?.label ?? "Your library"}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    thinkingStatus={thinkingStatus}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
                Ask a question below. We embed your query, retrieve matching
                passages from this source, and answer with the model.
              </p>
            </div>
          )}

          {hasSources && !hasMessages && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {suggestedPrompts.map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-xl border border-border bg-muted/30 px-4 py-5 text-left text-sm font-medium text-muted-foreground"
                >
                  {prompt}
                </div>
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
  placeholder?: string
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type a query here...",
}: QueryInputProps) {
  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-4">
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
            placeholder={placeholder}
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
    <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
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
