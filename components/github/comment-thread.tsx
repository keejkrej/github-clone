"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { CircleDot, Smile } from "lucide-react"

import { Markdown } from "@/components/github/markdown"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePlatform } from "@/lib/platform/provider"
import { addIssueComment, canModerate, setIssueState } from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import type { Comment, Issue, PullRequest } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

export function CommentCard({
  author,
  createdAt,
  body,
  header,
}: {
  author: string
  createdAt: string
  body: string
  header?: ReactNode
}) {
  return (
    <article className="flex gap-3">
      <UserAvatar login={author} className="size-10" linked />
      <div className="min-w-0 flex-1 overflow-hidden rounded-md border">
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-3 py-2 text-xs">
          <Link href={`/${author}`} className="font-semibold text-foreground hover:text-[#0969da] hover:underline">
            {author}
          </Link>
          <span className="text-muted-foreground">
            {header ?? (
              <>
                commented <RelativeTime at={createdAt} />
              </>
            )}
          </span>
        </div>
        <div className="px-3 py-3">
          {body.trim() ? (
            <Markdown source={body} />
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
        </div>
      </div>
    </article>
  )
}

export function Timeline({
  item,
  kind,
}: {
  item: Issue | PullRequest
  kind: "issue" | "pull"
}) {
  usePlatform()
  const merged = kind === "pull" && "merged" in item ? item.merged : false
  return (
    <div className="relative space-y-4">
      <div className="absolute top-4 bottom-4 left-5 w-px bg-border" aria-hidden />
      <CommentCard
        author={item.author}
        createdAt={item.createdAt}
        body={item.body}
        header={
          <>
            opened this {kind === "pull" ? "pull request" : "issue"} <RelativeTime at={item.createdAt} />
          </>
        }
      />
      {item.comments.map((comment: Comment) => (
        <CommentCard key={comment.id} author={comment.author} createdAt={comment.createdAt} body={comment.body} />
      ))}
      {item.state === "closed" && (
        <div className="relative flex items-center gap-3 bg-background py-1 pl-1">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-white",
              merged ? "bg-[#8250df]" : "bg-[#cf222e]",
            )}
          >
            <CircleDot className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            <Link href={`/${merged && "mergedBy" in item && item.mergedBy ? item.mergedBy : item.author}`} className="font-semibold text-foreground hover:text-[#0969da]">
              {merged && "mergedBy" in item && item.mergedBy ? item.mergedBy : item.author}
            </Link>{" "}
            {merged ? "merged" : "closed"} this {kind === "pull" ? "pull request" : "issue"}{" "}
            <RelativeTime at={item.closedAt ?? item.createdAt} />
          </p>
        </div>
      )}
    </div>
  )
}

export function CommentComposer({
  repoId,
  number,
  author,
  kind,
  state: itemState,
  merged,
}: {
  repoId: string
  number: number
  author: string
  kind: "issue" | "pull"
  state: "open" | "closed"
  merged?: boolean
}) {
  const { state } = usePlatform()
  const [body, setBody] = useState("")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const login = state.sessionLogin
  const moderate = canModerate(repoId, author, login)
  const canSubmit = body.trim().length > 0

  function comment() {
    if (!canSubmit) return
    addIssueComment(repoId, number, body.trim(), login)
    setBody("")
    setTab("write")
  }

  function toggleState() {
    if (!moderate || merged) return
    setIssueState(repoId, number, itemState === "open" ? "closed" : "open")
  }

  return (
    <div className="flex gap-3">
      <UserAvatar login={login} className="size-10" />
      <div className="min-w-0 flex-1 overflow-hidden rounded-md border">
        <div className="flex gap-1 border-b bg-muted/40 px-2 pt-2">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn(
              "-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-sm",
              tab === "write" ? "border-border border-b-background bg-background font-semibold" : "text-muted-foreground",
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-sm",
              tab === "preview" ? "border-border border-b-background bg-background font-semibold" : "text-muted-foreground",
            )}
          >
            Preview
          </button>
        </div>
        <div className="p-2">
          {tab === "write" ? (
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Leave a comment"
              rows={6}
              className="min-h-32"
            />
          ) : (
            <div className="min-h-32 rounded-md border px-3 py-2">
              {body.trim() ? (
                <Markdown source={body} />
              ) : (
                <p className="text-sm text-muted-foreground">Nothing to preview</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Smile className="size-3.5" />
            Markdown is supported
          </span>
          <div className="flex items-center gap-2">
            {moderate && !merged ? (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={toggleState}>
                {itemState === "open" ? `Close ${kind === "pull" ? "pull request" : "issue"}` : `Reopen ${kind === "pull" ? "pull request" : "issue"}`}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!canSubmit}
              onClick={comment}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
