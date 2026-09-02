"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BookMarked, CircleDot, GitPullRequest, Users } from "lucide-react"

import { IssueRow } from "@/components/github/issue-row"
import { RepoCard } from "@/components/github/repo-card"
import { UnderlineNav } from "@/components/github/underline-nav"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePlatform } from "@/lib/platform/provider"
import { search } from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

const TYPES = ["repositories", "issues", "pullrequests", "users"] as const
type SearchType = (typeof TYPES)[number]

function parseType(value: string | null): SearchType {
  if (value === "issues" || value === "pullrequests" || value === "users") return value
  return "repositories"
}

function SearchPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { state } = usePlatform()
  const q = params.get("q") ?? ""
  const type = parseType(params.get("type"))
  const [draft, setDraft] = useState(q)

  useEffect(() => {
    setDraft(q)
  }, [q])

  const results = useMemo(() => search(q), [state, q])

  function go(next: { q?: string; type?: SearchType }) {
    const query = next.q ?? q
    const nextType = next.type ?? type
    const usp = new URLSearchParams()
    if (query) usp.set("q", query)
    if (nextType !== "repositories") usp.set("type", nextType)
    router.push(`/search?${usp.toString()}`)
  }

  const counts = {
    repositories: results.repos.length,
    issues: results.issues.length,
    pullrequests: results.pullRequests.length,
    users: results.users.length,
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          go({ q: draft })
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search GitHub"
          className="max-w-xl"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="mt-4">
        <UnderlineNav
          accent="dark"
          tabs={[
            {
              href: `/search?q=${encodeURIComponent(q)}`,
              label: "Repositories",
              icon: <BookMarked className="size-4" />,
              count: counts.repositories,
              active: type === "repositories",
            },
            {
              href: `/search?q=${encodeURIComponent(q)}&type=issues`,
              label: "Issues",
              icon: <CircleDot className="size-4" />,
              count: counts.issues,
              active: type === "issues",
            },
            {
              href: `/search?q=${encodeURIComponent(q)}&type=pullrequests`,
              label: "Pull requests",
              icon: <GitPullRequest className="size-4" />,
              count: counts.pullrequests,
              active: type === "pullrequests",
            },
            {
              href: `/search?q=${encodeURIComponent(q)}&type=users`,
              label: "Users",
              icon: <Users className="size-4" />,
              count: counts.users,
              active: type === "users",
            },
          ]}
        />
      </div>

      <div className="mt-6">
        {!q.trim() ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Search all of GitHub for repositories, issues, pull requests, and people.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {counts[type]} {type === "pullrequests" ? "pull request" : type.replace(/s$/, "")}
              {counts[type] === 1 ? "" : "s"} matching <span className="font-semibold text-foreground">{q}</span>
            </p>

            {type === "repositories" &&
              (results.repos.length === 0 ? (
                <Empty q={q} kind="repositories" />
              ) : (
                results.repos.map((repo) => <RepoCard key={repo.id} repo={repo} variant="row" showOwner />)
              ))}

            {type === "issues" &&
              (results.issues.length === 0 ? (
                <Empty q={q} kind="issues" />
              ) : (
                <div className="overflow-hidden rounded-md border">
                  {results.issues.map((issue) => (
                    <IssueRow key={issue.id} item={issue} kind="issue" />
                  ))}
                </div>
              ))}

            {type === "pullrequests" &&
              (results.pullRequests.length === 0 ? (
                <Empty q={q} kind="pull requests" />
              ) : (
                <div className="overflow-hidden rounded-md border">
                  {results.pullRequests.map((pull) => (
                    <IssueRow key={pull.id} item={pull} kind="pull" />
                  ))}
                </div>
              ))}

            {type === "users" &&
              (results.users.length === 0 ? (
                <Empty q={q} kind="users" />
              ) : (
                <ul>
                  {results.users.map((user) => (
                    <li key={user.login} className="flex items-start gap-3 border-b py-4">
                      <UserAvatar login={user.login} className="size-12" linked />
                      <div>
                        <Link href={`/${user.login}`} className="text-lg font-semibold text-[#0969da] hover:underline">
                          {user.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">{user.login}</div>
                        {user.bio ? <p className="mt-1 text-sm">{user.bio}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Joined <RelativeTime at={user.createdAt} /> · {user.followers.length} followers
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
          </>
        )}
      </div>
    </div>
  )
}

function Empty({ q, kind }: { q: string; kind: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      We couldn’t find any {kind} matching <span className="font-medium text-foreground">{q}</span>
    </p>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-[1280px] px-4 py-10 text-sm text-muted-foreground">Loading search…</div>}
    >
      <SearchPage />
    </Suspense>
  )
}
