"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Copy, FileCode2 } from "lucide-react"

import { PullHeader, PullMissing } from "@/components/github/pr-header"
import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import {
  commitSubject,
  getPull,
  getRepo,
  loginFromIdent,
  pullCommits,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

export default function PullCommitsPage() {
  const params = useParams<{ owner: string; repo: string; number: string }>()
  const snapshot = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const number = Number(params.number)
  const repo = getRepo(owner, name)
  const pull = repo ? getPull(repo.id, number) : undefined
  const commits = useMemo(() => (pull ? pullCommits(pull) : []), [pull, snapshot.rev])

  if (!repo) return null
  if (!pull) return <PullMissing owner={owner} name={name} number={params.number} />

  const base = `/${owner}/${name}`

  return (
    <div className="mx-auto w-full max-w-[1012px] px-4 py-4">
      <PullHeader repo={repo} pull={pull} tab="commits" />
      {commits.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">This pull request doesn’t have any commits.</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          {commits.map((commit) => {
            const login = loginFromIdent(commit.author)
            return (
              <article key={commit.sha} className="flex flex-wrap items-start gap-3 border-b px-3 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${base}/commit/${commit.sha}`}
                    className="font-semibold hover:text-[#0969da] hover:underline"
                  >
                    {commitSubject(commit.message)}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <UserAvatar login={login} className="size-5" linked />
                    <Link href={`/${login}`} className="font-semibold text-foreground hover:text-[#0969da] hover:underline">
                      {login}
                    </Link>
                    <span>
                      committed <RelativeTime at={commit.author.timestamp} />
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md border p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Copy SHA"
                    onClick={() => navigator.clipboard.writeText(commit.sha).catch(() => undefined)}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <Link
                    href={`${base}/commit/${commit.sha}`}
                    className="rounded-md border px-2 py-1 font-mono text-xs text-[#0969da] hover:underline"
                  >
                    {shortSha(commit.sha)}
                  </Link>
                  <Link
                    href={`${base}/tree/${commit.sha}`}
                    className="rounded-md border p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Browse files"
                  >
                    <FileCode2 className="size-4" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
