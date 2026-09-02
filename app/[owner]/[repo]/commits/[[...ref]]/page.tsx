"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Copy, FileCode2, GitCommitHorizontal } from "lucide-react"

import { BranchPicker } from "@/components/github/branch-picker"
import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import {
  commitSubject,
  getRepo,
  gitLog,
  gitResolveRef,
  listBranches,
  loginFromIdent,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import { formatDateKey, toDateKey } from "@/lib/platform/time"

export default function CommitsPage() {
  const params = useParams<{ owner: string; repo: string; ref?: string[] }>()
  const { rev } = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  const requested = (params.ref ?? []).map((part) => decodeURIComponent(part)).join("/")
  const refName = requested || repo?.defaultBranch || "main"
  const resolved = repo ? gitResolveRef(repo.id, refName) : null
  const commits = useMemo(() => (repo && resolved ? gitLog(repo.id, refName) : []), [repo, resolved, refName, rev])
  const groups = useMemo(() => {
    const out: { day: string; commits: typeof commits }[] = []
    for (const commit of commits) {
      const day = toDateKey(commit.author.timestamp)
      const last = out[out.length - 1]
      if (last && last.day === day) last.commits.push(commit)
      else out.push({ day, commits: [commit] })
    }
    return out
  }, [commits])

  if (!repo) return null
  if (!resolved) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-muted-foreground">
        This is not a valid ref.
      </div>
    )
  }

  const base = `/${owner}/${name}`
  const branches = listBranches(repo.id)

  return (
    <div className="mx-auto w-full max-w-[896px] px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BranchPicker owner={owner} name={name} repoId={repo.id} current={refName} mode="commits" />
        <span className="text-sm text-muted-foreground">
          {branches.length} branch{branches.length === 1 ? "" : "es"}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">This branch doesn’t have any commits yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.day} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <GitCommitHorizontal className="size-4 text-muted-foreground" />
              Commits on {formatDateKey(group.day)}
            </h2>
            <div className="overflow-hidden rounded-md border">
              {group.commits.map((commit) => {
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
                      <CopySha sha={commit.sha} />
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
          </section>
        ))
      )}
    </div>
  )
}

function CopySha({ sha }: { sha: string }) {
  return (
    <button
      type="button"
      className="rounded-md border p-1 text-muted-foreground hover:text-foreground"
      aria-label="Copy SHA"
      onClick={() => navigator.clipboard.writeText(sha).catch(() => undefined)}
    >
      <Copy className="size-3.5" />
    </button>
  )
}
