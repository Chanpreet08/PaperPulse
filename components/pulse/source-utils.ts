import type { SourceType } from "@/components/pulse/types"

export function getFileSourceType(filename: string): SourceType {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "vtt" || ext === "srt") return "transcript"
  return "text"
}

export function getUrlSourceType(url: string): SourceType {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return "youtube"
  return "website"
}

export function sourceTypeLabel(type: SourceType): string {
  switch (type) {
    case "pdf":
      return "PDF"
    case "text":
      return "Text"
    case "transcript":
      return "VTT"
    case "youtube":
      return "YouTube"
    case "website":
      return "Web link"
  }
}

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
  } catch {
    return null
  }
  return null
}
