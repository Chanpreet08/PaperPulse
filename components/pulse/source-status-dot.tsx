import { cn } from "@/lib/utils"

import type { SourceStatus } from "@/components/pulse/types"

const statusStyles: Record<SourceStatus, string> = {
  indexing: "bg-amber-400",
  indexed: "bg-emerald-500",
  error: "bg-destructive",
}

const statusLabels: Record<SourceStatus, string> = {
  indexing: "Indexing",
  indexed: "Indexed",
  error: "Error",
}

export function SourceStatusDot({
  status,
  className,
}: {
  status: SourceStatus
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label={statusLabels[status]}
      className={cn("size-2 shrink-0 rounded-full", statusStyles[status], className)}
    />
  )
}
