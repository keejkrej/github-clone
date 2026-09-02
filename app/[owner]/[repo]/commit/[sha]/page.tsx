"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { DiffStats, DiffView } from "@/components/github/diff-view"
import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import {
  commitBody,
  commitSubject,
  findCommit,
  getRepo,
  gitDiffTrees,
  loginFromIdent,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import { formatCommitDatetime } from "@/lib/platform/time"

export default function CommitPage() {
  const params = useParams<{ owner: string; repo: string; sha: string }>()
  const { rev } = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const shaParam = decodeURIComponent(params.sha ?? "")
  const repo = getRepo(owner, name)
  const commit = repo ? findCommit(repo.id, shaParam) : null
  const diffs = useMemo(() => {
    if (!repo || !commit) return []
    const parent = commit.parents[0] ?? null
    return gitDiffTrees(repo.id, parent, commit.sha)
  }, [repo, commit, rev])

  if (!repo) return null
  if (!commit) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-muted-foreground">
        Commit not found.
      </div>
    )
  }

  const login = loginFromIdent(commit.author)
  const base = `/${owner}/${name}`
  const body = commitBody(commit.message)

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <div className="rounded-md border">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h1 className="text-xl font-semibold">{commitSubject(commit.message)}</h1>
          {body ? <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{body}</pre> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <UserAvatar login={login} className="size-6" linked />
          <Link href={`/${login}`} className="font-semibold hover:text-[#0969da] hover:underline">
            {login}
          </Link>
          <span className="text-muted-foreground">
            committed <RelativeTime at={commit.author.timestamp} /> · {formatCommitDatetime(commit.author.timestamp)}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
            {commit.parents.map((parent) => (
              <span key={parent}>
                parent{" "}
                <Link href={`${base}/commit/${parent}`} className="text-[#0969da] hover:underline">
                  {shortSha(parent)}
                </Link>
              </span>
            ))}
            <span>
              commit <span className="text-foreground">{commit.sha}</span>
            </span>
            <Link href={`${base}/tree/${commit.sha}`} className="text-[#0969da] hover:underline">
              Browse files
            </Link>
          </span>
        </div>
      </div>

      <div className="mt-4 mb-3">
        <DiffStats diffs={diffs} />
      </div>
      <DiffView diffs={diffs} />
    </div>
  )
}
