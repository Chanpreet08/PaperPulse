"use client"

import * as React from "react"
import {
  CirclePlay,
  FilePlay,
  FileText,
  Globe,
  Link,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"

type SourceType = "pdf" | "text" | "transcript" | "youtube" | "website"

interface Source {
  id: string
  type: SourceType
  label: string
  file?: File
  url?: string
}

const ACCEPTED_EXTENSIONS = ".pdf,.txt,.md,.vtt,.srt"

function getFileSourceType(filename: string): SourceType {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "vtt" || ext === "srt") return "transcript"
  return "text"
}

function getUrlSourceType(url: string): SourceType {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return "youtube"
  return "website"
}

function SourceIcon({ type }: { type: SourceType }) {
  switch (type) {
    case "pdf":
      return <FileText />
    case "text":
      return <FileText />
    case "transcript":
      return <FilePlay />
    case "youtube":
      return <CirclePlay />
    case "website":
      return <Globe />
  }
}

function sourceTypeLabel(type: SourceType): string {
  switch (type) {
    case "pdf":
      return "PDF"
    case "text":
      return "Text file"
    case "transcript":
      return "Transcript"
    case "youtube":
      return "YouTube"
    case "website":
      return "Website"
  }
}

export function SourceInput() {
  const [sources, setSources] = React.useState<Source[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [urlValue, setUrlValue] = React.useState("")
  const [urlError, setUrlError] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const newSources: Source[] = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      type: getFileSourceType(file.name),
      label: file.name,
      file,
    }))
    setSources((prev) => [...prev, ...newSources])
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ""
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleAddUrl() {
    setUrlError("")
    const raw = urlValue.trim()
    if (!raw) {
      setUrlError("Please enter a URL.")
      return
    }
    try {
      const parsed = new URL(raw)
      const type = getUrlSourceType(parsed.href)
      setSources((prev) => [
        ...prev,
        {
          id: `${raw}-${Date.now()}`,
          type,
          label: raw,
          url: raw,
        },
      ])
      setUrlValue("")
    } catch {
      setUrlError("Please enter a valid URL (e.g. https://example.com).")
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAddUrl()
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          isDragging
            ? "border-ring bg-muted/60"
            : "border-border bg-muted/30 hover:border-ring/60 hover:bg-muted/50",
        ].join(" ")}
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-foreground/8">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, TXT, Markdown, VTT, SRT — multiple files supported
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or add a link</span>
        <Separator className="flex-1" />
      </div>

      {/* URL input row */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://example.com or YouTube URL"
              value={urlValue}
              onChange={(e) => {
                setUrlValue(e.target.value)
                if (urlError) setUrlError("")
              }}
              onKeyDown={handleUrlKeyDown}
              aria-invalid={!!urlError}
              className="pl-8"
            />
          </div>
          <Button onClick={handleAddUrl} variant="outline" className="shrink-0">
            Add
          </Button>
        </div>
        {urlError && (
          <p className="text-xs text-destructive">{urlError}</p>
        )}
      </div>

      {/* Source chips */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {sources.length} source{sources.length !== 1 ? "s" : ""} added
          </p>
          <AttachmentGroup>
            {sources.map((source) => (
              <Attachment key={source.id} state="done">
                <AttachmentMedia>
                  <SourceIcon type={source.type} />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{source.label}</AttachmentTitle>
                  <AttachmentDescription>
                    {sourceTypeLabel(source.type)}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="Remove source"
                    onClick={() => removeSource(source.id)}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        </div>
      )}
    </div>
  )
}
