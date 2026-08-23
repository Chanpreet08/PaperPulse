"use client"

import {
  CirclePlay,
  FilePlay,
  FileText,
  Globe,
  Plus,
} from "lucide-react"

import { SourceStatusDot } from "@/components/pulse/source-status-dot"
import { sourceTypeLabel } from "@/components/pulse/source-utils"
import type { PulseSource } from "@/components/pulse/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

function SourceIcon({ type }: { type: PulseSource["type"] }) {
  switch (type) {
    case "pdf":
    case "text":
      return <FileText className="size-4" />
    case "transcript":
      return <FilePlay className="size-4" />
    case "youtube":
      return <CirclePlay className="size-4" />
    case "website":
      return <Globe className="size-4" />
  }
}

type SourceSidebarProps = {
  sources: PulseSource[]
  selectedSourceId: string | null
  onAddSource: () => void
  onSelectSource: (id: string) => void
}

export function SourceSidebar({
  sources,
  selectedSourceId,
  onAddSource,
  onSelectSource,
}: SourceSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-4">
        <Button className="w-full justify-start gap-2" onClick={onAddSource}>
          <Plus className="size-4" />
          Add Source
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {sources.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No sources yet. Add your first document or link.
            </p>
          ) : (
            sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onSelectSource(source.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selectedSourceId === source.id
                    ? "border-ring bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-transparent bg-background/70 hover:bg-sidebar-accent/60"
                )}
              >
                <SourceStatusDot status={source.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{source.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {sourceTypeLabel(source.type)}
                    {source.status === "indexed" && source.chunkCount
                      ? ` · ${source.chunkCount} chunks`
                      : ""}
                  </p>
                </div>
                <SourceIcon type={source.type} />
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <SourceStatusDot status="indexing" />
          <span>Indexing</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <SourceStatusDot status="indexed" />
          <span>Indexed</span>
        </div>
      </div>
    </aside>
  )
}
