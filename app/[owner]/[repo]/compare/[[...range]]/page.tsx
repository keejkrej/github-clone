"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Check, GitBranch, GitCommitHorizontal } from "lucide-react"

import { DiffStats, DiffView } from "@/components/github/diff-view"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePlatform } from "@/lib/platform/provider"
import {
  commitSubject,
  createPull,
  findOpenPull,
  getRepo,
  gitDiffTrees,
  gitLog,
  gitResolveRef,
  listBranches,
  loginFromIdent,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

function parseRange(segments: string[], defaultBranch: string): { base: string; head: string } {
  const raw = segments.join("/")
  if (!raw) return { base: defaultBranch, head: defaultBranch }
  const idx = raw.indexOf("...")
  if (idx >= 0) {
    return {
      base: raw.slice(0, idx) || defaultBranch,
      head: raw.slice(idx + 3) || defaultBranch,
    }
  }
  return { base: defaultBranch, head: raw }
}

function BranchSelect({
  value,
  branches,
  onChange,
  label,
}: {
  value: string
  branches: string[]
  onChange: (next: string) => void
  label: string
}) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const filtered = q ? branches.filter((item) => item.toLowerCase().includes(q)) : branches
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border bg-muted/40 px-2 text-sm font-semibold hover:bg-muted">
        <span className="text-xs font-normal text-muted-foreground">{label}:</span>
        <GitBranch className="size-3.5 text-muted-foreground" />
        <span className="max-w-[160px] truncate">{value}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a branch..."
          className="h-8"
        />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {filtered.map((branch) => (
            <button
              key={branch}
              type="button"
              onClick={() => onChange(branch)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <GitBranch className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{branch}</span>
              {branch === value ? <Check className="size-3.5" /> : null}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ComparePage() {
  const params = useParams<{ owner: string; repo: string; range?: string[] }>()
  const router = useRouter()
  const snapshot = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  const branches = repo ? listBranches(repo.id) : []
  const parsed = parseRange(
    (params.range ?? []).map((part) => decodeURIComponent(part)),
    repo?.defaultBranch ?? "main",
  )
  const base = parsed.base
  const head = parsed.head
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const baseSha = repo ? gitResolveRef(repo.id, base) : null
  const headSha = repo ? gitResolveRef(repo.id, head) : null
  const existing = repo ? findOpenPull(repo.id, base, head, owner) : undefined

  const commits = useMemo(() => {
    if (!repo || !headSha) return []
    const headLog = gitLog(repo.id, head)
    if (!baseSha) return headLog
    const baseSet = new Set(gitLog(repo.id, base).map((commit) => commit.sha))
    return headLog.filter((commit) => !baseSet.has(commit.sha))
  }, [repo, base, head, baseSha, headSha, snapshot.rev])

  const diffs = useMemo(() => {
    if (!repo) return []
    try {
      return gitDiffTrees(repo.id, baseSha, headSha)
    } catch {
      return []
    }
  }, [repo, baseSha, headSha, snapshot.rev])

  if (!repo) return null

  function go(nextBase: string, nextHead: string) {
    router.push(`/${owner}/${name}/compare/${encodeURIComponent(nextBase)}...${encodeURIComponent(nextHead)}`)
  }

  const same = base === head || baseSha === headSha
  const defaultTitle = commits[0] ? commitSubject(commits[0].message) : `Merge ${head} into ${base}`
  const canCreate = !same && !existing && Boolean(baseSha && headSha) && !pending

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!repo || !canCreate) return
    setPending(true)
    setError(null)
    try {
      const pull = createPull({
        repoId: repo.id,
        title: (title.trim() || defaultTitle).slice(0, 256),
        body,
        head: { owner, repo: name, ref: head },
        base: { ref: base },
      })
      router.push(`/${owner}/${name}/pull/${pull.number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pull request.")
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1012px] px-4 py-6">
      <h1 className="text-2xl font-normal">Compare changes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose two branches to see what’s changed or to start a new pull request.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-3">
        <BranchSelect value={base} branches={branches} onChange={(next) => go(next, head)} label="base" />
        <span className="text-muted-foreground">...</span>
        <BranchSelect value={head} branches={branches} onChange={(next) => go(base, next)} label="compare" />
      </div>

      {(!baseSha || !headSha) && (
        <p className="mt-8 text-center text-sm text-muted-foreground">This is not a valid comparison.</p>
      )}

      {baseSha && headSha && same && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          There isn’t anything to compare. {head} is up to date with {base}.
        </p>
      )}

      {baseSha && headSha && !same && (
        <>
          {existing ? (
            <div className="mt-4 rounded-md border bg-muted/30 px-4 py-3 text-sm">
              There is already a pull request for this comparison:{" "}
              <Link
                href={`/${owner}/${name}/pull/${existing.number}`}
                className="font-semibold text-[#0969da] hover:underline"
              >
                {existing.title} #{existing.number}
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-4 overflow-hidden rounded-md border">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">Open a pull request</div>
              <div className="space-y-3 p-4">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={defaultTitle}
                  aria-label="Pull request title"
                />
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Leave a comment"
                  rows={6}
                  className="min-h-32"
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!canCreate}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {pending ? "Creating…" : "Create pull request"}
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <GitCommitHorizontal className="size-4" />
              {commits.length} commit{commits.length === 1 ? "" : "s"}
            </span>
            <DiffStats diffs={diffs} />
          </div>

          <div className="mt-4 overflow-hidden rounded-md border">
            {commits.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No unique commits on this branch.</p>
            ) : (
              commits.map((commit) => {
                const login = loginFromIdent(commit.author)
                return (
                  <article
                    key={commit.sha}
                    className="flex flex-wrap items-start gap-3 border-b px-3 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${owner}/${name}/commit/${commit.sha}`}
                        className="font-semibold hover:text-[#0969da] hover:underline"
                      >
                        {commitSubject(commit.message)}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <UserAvatar login={login} className="size-5" linked />
                        <Link
                          href={`/${login}`}
                          className="font-semibold text-foreground hover:text-[#0969da] hover:underline"
                        >
                          {login}
                        </Link>
                        <span>
                          committed <RelativeTime at={commit.author.timestamp} />
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/${owner}/${name}/commit/${commit.sha}`}
                      className="rounded-md border px-2 py-1 font-mono text-xs text-[#0969da] hover:underline"
                    >
                      {shortSha(commit.sha)}
                    </Link>
                  </article>
                )
              })
            )}
          </div>

          <div className="mt-6">
            <DiffView diffs={diffs} />
          </div>
        </>
      )}
    </div>
  )
}
