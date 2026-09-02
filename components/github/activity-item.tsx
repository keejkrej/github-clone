"use client"

import Link from "next/link"
import { GitCommitHorizontal, GitFork, GitMerge, GitPullRequest, MessageSquare, Star } from "lucide-react"

import { UserAvatar } from "@/components/github/user-avatar"
import { getPull } from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import type { ActivityEvent } from "@/lib/platform/types"

function verbCopy(event: ActivityEvent) {
  switch (event.verb) {
    case "starred":
      return "starred"
    case "forked":
      return "forked"
    case "pushed":
      return "pushed to"
    case "merged":
      return "merged pull request"
    case "commented":
      return "commented on"
    case "opened":
      return event.message === "created repository" ? "created a repository" : "opened"
    default:
      return event.verb
  }
}

function VerbIcon({ verb }: { verb: ActivityEvent["verb"] }) {
  const className = "size-4 text-muted-foreground"
  if (verb === "starred") return <Star className={className} />
  if (verb === "forked") return <GitFork className={className} />
  if (verb === "merged") return <GitMerge className={`${className} gh-merged`} />
  if (verb === "commented") return <MessageSquare className={className} />
  if (verb === "pushed") return <GitCommitHorizontal className={className} />
  return <GitPullRequest className={className} />
}

export function ActivityItem({ event }: { event: ActivityEvent }) {
  const [owner, name] = event.repoId.split("/")
  const pull = event.number != null ? getPull(event.repoId, event.number) : undefined
  const href =
    event.number != null
      ? pull
        ? `/${owner}/${name}/pull/${event.number}`
        : `/${owner}/${name}/issues/${event.number}`
      : `/${owner}/${name}`

  return (
    <article className="flex gap-3 border-b py-4 last:border-b-0">
      <UserAvatar login={event.actor} className="size-8" linked />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <VerbIcon verb={event.verb} />
          <Link href={`/${event.actor}`} className="font-semibold hover:text-[#0969da] hover:underline">
            {event.actor}
          </Link>
          <span className="text-muted-foreground">{verbCopy(event)}</span>
          <Link href={`/${owner}/${name}`} className="font-semibold text-[#0969da] hover:underline">
            {event.repoId}
          </Link>
          {event.number != null && (
            <Link href={href} className="text-muted-foreground hover:text-[#0969da] hover:underline">
              #{event.number}
            </Link>
          )}
          <span className="text-muted-foreground">
            · <RelativeTime at={event.at} />
          </span>
        </div>
        {event.message && event.message !== "created repository" ? (
          <Link
            href={href}
            className="mt-1 block truncate text-sm text-muted-foreground hover:text-[#0969da]"
          >
            {event.message}
          </Link>
        ) : null}
      </div>
    </article>
  )
}
