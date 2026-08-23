"use client"

import * as React from "react"
import { ExternalLink, FileText, Globe, X } from "lucide-react"

import {
  getYouTubeEmbedUrl,
  sourceTypeLabel,
} from "@/components/pulse/source-utils"
import type { PulseSource } from "@/components/pulse/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

type SourcePreviewProps = {
  source: PulseSource
  onClose: () => void
}

export function SourcePreview({ source, onClose }: SourcePreviewProps) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!source.file || source.type !== "pdf") {
      setObjectUrl(null)
      return
    }

    const url = URL.createObjectURL(source.file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source.file, source.type])

  const youtubeEmbed =
    source.type === "youtube" && source.url
      ? getYouTubeEmbedUrl(source.url)
      : null

  return (
    <aside className="flex w-full max-w-xl shrink-0 flex-col border-l border-border bg-card lg:w-[38%]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{source.label}</p>
          <p className="text-xs text-muted-foreground">
            {sourceTypeLabel(source.type)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex min-h-full flex-col p-4">
          {source.type === "pdf" && objectUrl ? (
            <iframe
              title={source.label}
              src={objectUrl}
              className="min-h-[70vh] w-full rounded-xl border border-border bg-background"
            />
          ) : source.type === "youtube" && youtubeEmbed ? (
            <iframe
              title={source.label}
              src={youtubeEmbed}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-xl border border-border bg-background"
            />
          ) : source.type === "website" && source.url ? (
            <div className="flex min-h-[70vh] flex-col gap-3">
              <iframe
                title={source.label}
                src={source.url}
                className="min-h-[60vh] w-full flex-1 rounded-xl border border-border bg-background"
              />
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 items-center justify-center gap-1 rounded-2xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                <ExternalLink className="size-4" />
                Open in new tab
              </a>
            </div>
          ) : source.file ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{source.label}</p>
                <p className="text-xs text-muted-foreground">
                  Preview is not available for this file type yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Globe className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No preview available for this source.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
