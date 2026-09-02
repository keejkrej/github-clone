"use client"

import Link from "next/link"
import { GitCommitHorizontal, GitPullRequest } from "lucide-react"

import { StateBadge } from "@/components/github/state-badge"
import { UnderlineNav } from "@/components/github/underline-nav"
import { usePlatform } from "@/lib/platform/provider"
import { pullCommits, pullDiff } from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import type { PullRequest, Repository } from "@/lib/platform/types"

export function PullHeader({
  repo,
  pull,
  tab,
}: {
  repo: Repository
  pull: PullRequest
  tab: "conversation" | "commits" | "files"
}) {
  usePlatform()
  const base = `/${repo.ownerLogin}/${repo.name}`
  const commits = pullCommits(pull)
  const diffs = pullDiff(pull)
  const additions = diffs.reduce((sum, file) => sum + file.additions, 0)
  const deletions = diffs.reduce((sum, file) => sum + file.deletions, 0)

  return (
    <div className="mb-4">
      <h1 className="text-2xl font-normal">
        {pull.title}{" "}
        <span className="font-light text-muted-foreground">#{pull.number}</span>
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <StateBadge kind="pull" state={pull.state} merged={pull.merged} />
        <span className="text-muted-foreground">
          <Link href={`/${pull.author}`} className="font-semibold text-foreground hover:text-[#0969da] hover:underline">
            {pull.author}
          </Link>{" "}
          {pull.merged ? "merged" : pull.state === "closed" ? "wanted to merge" : "wants to merge"} {commits.length}{" "}
          commit{commits.length === 1 ? "" : "s"} into{" "}
          <span className="rounded-full border bg-muted/50 px-1.5 py-0.5 font-mono text-xs">{pull.base.ref}</span> from{" "}
          <span className="rounded-full border bg-muted/50 px-1.5 py-0.5 font-mono text-xs">
            {pull.head.owner === repo.ownerLogin && pull.head.repo === repo.name
              ? pull.head.ref
              : `${pull.head.owner}:${pull.head.ref}`}
          </span>{" "}
          <RelativeTime at={pull.createdAt} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <GitCommitHorizontal className="size-4" />
          {commits.length} commit{commits.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitPullRequest className="size-4" />
          {diffs.length} file{diffs.length === 1 ? "" : "s"} changed
        </span>
        <span>
          <span className="font-semibold gh-open">+{additions}</span>{" "}
          <span className="font-semibold gh-closed">−{deletions}</span>
        </span>
      </div>
      <div className="mt-4">
        <UnderlineNav
          accent="dark"
          tabs={[
            {
              href: `${base}/pull/${pull.number}`,
              label: "Conversation",
              count: pull.comments.length,
              active: tab === "conversation",
            },
            {
              href: `${base}/pull/${pull.number}/commits`,
              label: "Commits",
              count: commits.length,
              active: tab === "commits",
            },
            {
              href: `${base}/pull/${pull.number}/files`,
              label: "Files changed",
              count: diffs.length,
              active: tab === "files",
            },
          ]}
        />
      </div>
    </div>
  )
}

export function PullMissing({ owner, name, number }: { owner: string; name: string; number: string }) {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <h1 className="text-2xl font-light">Pull request not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        There isn’t a pull request #{number} in {owner}/{name}.
      </p>
      <Link href={`/${owner}/${name}/pulls`} className="mt-6 inline-block text-sm text-[#0969da] hover:underline">
        Back to pull requests
      </Link>
    </div>
  )
}
