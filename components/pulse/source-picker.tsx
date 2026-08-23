"use client"

import * as React from "react"
import {
  ArrowLeft,
  CirclePlay,
  FilePlay,
  FileText,
  Globe,
  Link2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PickerKind = "pdf" | "text" | "youtube" | "transcript" | "website"

type SourcePickerProps = {
  onBack: () => void
  onPickFile: (file: File) => void
  onPickUrl: (url: string, kind: "youtube" | "website") => void
}

const fileAccept: Record<Exclude<PickerKind, "youtube" | "website">, string> = {
  pdf: ".pdf",
  text: ".txt,.md",
  transcript: ".vtt,.srt",
}

function PickerTile({
  label,
  icon,
  className,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-8 text-center shadow-sm transition-colors hover:border-ring hover:bg-muted/40",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export function SourcePicker({
  onBack,
  onPickFile,
  onPickUrl,
}: SourcePickerProps) {
  const [urlKind, setUrlKind] = React.useState<"youtube" | "website" | null>(
    null
  )
  const [urlValue, setUrlValue] = React.useState("")
  const [urlError, setUrlError] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const pendingKindRef = React.useRef<Exclude<PickerKind, "youtube" | "website">>(
    "pdf"
  )

  function openFilePicker(kind: Exclude<PickerKind, "youtube" | "website">) {
    pendingKindRef.current = kind
    const input = fileInputRef.current
    if (!input) return
    input.accept = fileAccept[kind]
    input.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) onPickFile(file)
  }

  function handleSubmitUrl() {
    if (!urlKind) return
    setUrlError("")
    const trimmed = urlValue.trim()
    if (!trimmed) {
      setUrlError("Enter a URL to continue.")
      return
    }
    try {
      const parsed = new URL(trimmed)
      onPickUrl(parsed.href, urlKind)
      setUrlValue("")
      setUrlKind(null)
    } catch {
      setUrlError("Enter a valid URL (e.g. https://example.com).")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Add a source</h1>
          <p className="text-sm text-muted-foreground">
            Choose how you want to import content.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
        <div className="grid flex-1 grid-cols-2 gap-4">
          <PickerTile
            label="PDF"
            icon={<FileText className="size-6 text-muted-foreground" />}
            onClick={() => openFilePicker("pdf")}
          />
          <PickerTile
            label="Text"
            icon={<FileText className="size-6 text-muted-foreground" />}
            onClick={() => openFilePicker("text")}
          />
          <PickerTile
            label="YT Link"
            icon={<CirclePlay className="size-6 text-muted-foreground" />}
            onClick={() => {
              setUrlKind("youtube")
              setUrlError("")
            }}
          />
          <PickerTile
            label="VTT"
            icon={<FilePlay className="size-6 text-muted-foreground" />}
            onClick={() => openFilePicker("transcript")}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setUrlKind("website")
            setUrlError("")
          }}
          className="flex min-h-56 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm transition-colors hover:border-ring hover:bg-muted/40 lg:max-w-xs"
        >
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
            <Globe className="size-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">Web Link</p>
            <p className="text-sm text-muted-foreground">
              Index a page from the open web.
            </p>
          </div>
        </button>
      </div>

      {urlKind && (
        <div className="border-t border-border bg-muted/20 px-6 py-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <p className="text-sm font-medium">
              {urlKind === "youtube" ? "YouTube link" : "Website link"}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  type="url"
                  placeholder={
                    urlKind === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://example.com/article"
                  }
                  value={urlValue}
                  onChange={(event) => {
                    setUrlValue(event.target.value)
                    if (urlError) setUrlError("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSubmitUrl()
                  }}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSubmitUrl}>Add</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUrlKind(null)
                  setUrlValue("")
                  setUrlError("")
                }}
              >
                Cancel
              </Button>
            </div>
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
