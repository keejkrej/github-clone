"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { CommentComposer, Timeline } from "@/components/github/comment-thread"
import { IssueSidebar } from "@/components/github/issue-sidebar"
import { StateBadge } from "@/components/github/state-badge"
import { usePlatform } from "@/lib/platform/provider"
import { getIssue, getPull, getRepo } from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

export default function IssueDetailPage() {
  const router = useRouter()
  const params = useParams<{ owner: string; repo: string; number: string }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const number = Number(params.number)
  const repo = getRepo(owner, name)
  const issue = repo ? getIssue(repo.id, number) : undefined
  const pull = repo ? getPull(repo.id, number) : undefined

  useEffect(() => {
    if (repo && pull && !issue) {
      router.replace(`/${owner}/${name}/pull/${number}`)
    }
  }, [repo, pull, issue, owner, name, number, router])

  if (!repo) return null
  if (pull && !issue) return null
  if (!issue) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-24 text-center">
        <h1 className="text-2xl font-light">Issue not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          There isn’t an issue #{params.number} in {owner}/{name}.
        </p>
        <Link href={`/${owner}/${name}/issues`} className="mt-6 inline-block text-sm text-[#0969da] hover:underline">
          Back to issues
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <h1 className="text-2xl font-normal">
        {issue.title} <span className="font-light text-muted-foreground">#{issue.number}</span>
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StateBadge kind="issue" state={issue.state} />
        <span>
          <Link href={`/${issue.author}`} className="font-semibold text-foreground hover:text-[#0969da] hover:underline">
            {issue.author}
          </Link>{" "}
          opened this issue <RelativeTime at={issue.createdAt} /> · {issue.comments.length} comment
          {issue.comments.length === 1 ? "" : "s"}
        </span>
      </div>
      <hr className="my-4" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <Timeline item={issue} kind="issue" />
          <CommentComposer
            repoId={issue.repoId}
            number={issue.number}
            author={issue.author}
            kind="issue"
            state={issue.state}
          />
        </div>
        <IssueSidebar item={issue} />
      </div>
    </div>
  )
}
