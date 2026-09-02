import { CircleCheck, CircleDot, GitMerge, GitPullRequest } from "lucide-react"

import { cn } from "@/lib/utils"

export function StateBadge({
  kind,
  state,
  merged,
  className,
}: {
  kind: "issue" | "pull"
  state: "open" | "closed"
  merged?: boolean
  className?: string
}) {
  if (kind === "pull" && merged) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-[#8250df] px-2.5 py-1 text-xs font-semibold text-white",
          className,
        )}
      >
        <GitMerge className="size-3.5" />
        Merged
      </span>
    )
  }
  if (state === "closed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-[#cf222e] px-2.5 py-1 text-xs font-semibold text-white",
          className,
        )}
      >
        {kind === "pull" ? <GitPullRequest className="size-3.5" /> : <CircleCheck className="size-3.5" />}
        Closed
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[#1a7f37] px-2.5 py-1 text-xs font-semibold text-white",
        className,
      )}
    >
      {kind === "pull" ? <GitPullRequest className="size-3.5" /> : <CircleDot className="size-3.5" />}
      Open
    </span>
  )
}
