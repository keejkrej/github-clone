"use client"

import Link from "next/link"
import { CircleCheck, CircleDot, GitMerge, GitPullRequest, MessageSquare } from "lucide-react"

import { LabelPills } from "@/components/github/label-pill"
import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import { RelativeTime } from "@/components/github/relative-time"
import type { Issue, PullRequest } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function StatusIcon({
  kind,
  state,
  merged,
}: {
  kind: "issue" | "pull"
  state: "open" | "closed"
  merged?: boolean
}) {
  if (kind === "pull") {
    if (merged) return <GitMerge className="size-4 gh-merged" />
    if (state === "closed") return <GitPullRequest className="size-4 gh-closed" />
    return <GitPullRequest className="size-4 gh-open" />
  }
  if (state === "closed") return <CircleCheck className="size-4 gh-closed" />
  return <CircleDot className="size-4 gh-open" />
}

export function IssueRow({
  item,
  kind,
  showRepo = true,
}: {
  item: Issue | PullRequest
  kind: "issue" | "pull"
  showRepo?: boolean
}) {
  usePlatform()
  const [owner, name] = item.repoId.split("/")
  const href =
    kind === "pull"
      ? `/${owner}/${name}/pull/${item.number}`
      : `/${owner}/${name}/issues/${item.number}`
  const merged = kind === "pull" && "merged" in item ? item.merged : false
  const comments = item.comments.length

  return (
    <div className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40">
      <div className="mt-0.5 shrink-0">
        <StatusIcon kind={kind} state={item.state} merged={merged} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={href} className="text-sm font-semibold text-foreground hover:text-[#0969da]">
            {item.title}
          </Link>
          <LabelPills repoId={item.repoId} names={item.labels} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {showRepo && (
            <>
              <Link href={`/${owner}/${name}`} className="hover:text-[#0969da] hover:underline">
                {item.repoId}
              </Link>
              <span> · </span>
            </>
          )}
          <span>
            #{item.number} opened <RelativeTime at={item.createdAt} /> by{" "}
            <Link href={`/${item.author}`} className="hover:text-[#0969da] hover:underline">
              {item.author}
            </Link>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-center text-xs text-muted-foreground">
        {item.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {item.assignees.map((login) => (
              <UserAvatar key={login} login={login} className="size-5" linked />
            ))}
          </div>
        )}
        {comments > 0 && (
          <Link href={href} className="inline-flex items-center gap-1 hover:text-[#0969da]">
            <MessageSquare className="size-3.5" />
            {comments}
          </Link>
        )}
      </div>
    </div>
  )
}

export function StateFilters({
  openCount,
  closedCount,
  state,
  onChange,
}: {
  openCount: number
  closedCount: number
  state: "open" | "closed"
  onChange: (next: "open" | "closed") => void
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <button
        type="button"
        onClick={() => onChange("open")}
        className={cn(
          "inline-flex items-center gap-1.5",
          state === "open" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <CircleDot className="size-4" />
        {openCount} Open
      </button>
      <button
        type="button"
        onClick={() => onChange("closed")}
        className={cn(
          "inline-flex items-center gap-1.5",
          state === "closed" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <CircleCheck className="size-4" />
        {closedCount} Closed
      </button>
    </div>
  )
}
