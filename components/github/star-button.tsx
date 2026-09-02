"use client"

import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePlatform } from "@/lib/platform/provider"
import { isStarred, starCount, toggleStar } from "@/lib/platform/store"
import { cn } from "@/lib/utils"

export function StarButton({
  repoId,
  className,
  compact = false,
}: {
  repoId: string
  className?: string
  compact?: boolean
}) {
  const { state } = usePlatform()
  const starred = isStarred(state.sessionLogin, repoId)
  const count = starCount(repoId)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 gap-1 rounded-md px-2 text-xs font-semibold", className)}
      onClick={() => toggleStar(repoId)}
      aria-pressed={starred}
    >
      <Star className={cn("size-3.5", starred ? "fill-[#e3b341] text-[#e3b341]" : "text-muted-foreground")} />
      {compact ? (
        <span>{count}</span>
      ) : (
        <>
          <span>{starred ? "Starred" : "Star"}</span>
          <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
            {count}
          </span>
        </>
      )}
    </Button>
  )
}
