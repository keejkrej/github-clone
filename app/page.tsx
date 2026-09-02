"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { BookMarked, Plus } from "lucide-react"

import { ActivityItem } from "@/components/github/activity-item"
import { RepoCard } from "@/components/github/repo-card"
import { UserAvatar } from "@/components/github/user-avatar"
import { Input } from "@/components/ui/input"
import { usePlatform } from "@/lib/platform/provider"
import {
  listActivity,
  listRepos,
  listUserIssues,
  listUserPulls,
  trendingRepos,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

export default function HomePage() {
  const { state } = usePlatform()
  const session = state.sessionLogin
  const [repoQuery, setRepoQuery] = useState("")

  const topRepos = useMemo(() => {
    const owned = listRepos(session)
    const q = repoQuery.trim().toLowerCase()
    return (q ? owned.filter((repo) => repo.name.toLowerCase().includes(q) || repo.id.toLowerCase().includes(q)) : owned).slice(
      0,
      8,
    )
  }, [state, session, repoQuery])

  const feed = listActivity()
  const trending = trendingRepos(5).filter((repo) => repo.ownerLogin !== session)
  const explore = trendingRepos(8).filter((repo) => repo.ownerLogin !== session).slice(0, 3)
  const recent = [...listUserIssues(session), ...listUserPulls(session)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 py-6">
      <aside className="hidden w-[280px] shrink-0 md:block">
        <div className="flex items-center gap-2">
          <UserAvatar login={session} className="size-8" linked />
          <Link href={`/${session}`} className="text-sm font-semibold hover:underline">
            {session}
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Top repositories</h2>
          <Link
            href="/new"
            className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="size-3.5" />
            New
          </Link>
        </div>
        <Input
          value={repoQuery}
          onChange={(event) => setRepoQuery(event.target.value)}
          placeholder="Find a repository..."
          className="mt-2 h-8 bg-muted/40"
        />
        <ul className="mt-2">
          {topRepos.length === 0 ? (
            <li className="py-2 text-xs text-muted-foreground">
              {repoQuery ? "No matching repositories." : "You don’t have any repositories yet."}
            </li>
          ) : (
            topRepos.map((repo) => (
              <li key={repo.id}>
                <Link
                  href={`/${repo.ownerLogin}/${repo.name}`}
                  className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted"
                >
                  <BookMarked className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    <span className="text-muted-foreground">{repo.ownerLogin}/</span>
                    {repo.name}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <h2 className="mt-8 text-sm font-semibold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            When you open issues and pull requests, they’ll show up here.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recent.map((item) => {
              const isPull = "head" in item
              const href = isPull
                ? `/${item.repoId}/pull/${item.number}`
                : `/${item.repoId}/issues/${item.number}`
              return (
                <li key={item.id} className="text-xs">
                  <Link href={href} className="font-medium text-[#0969da] hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-muted-foreground">
                    {item.repoId} #{item.number} · <RelativeTime at={item.createdAt} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <main className="min-w-0 flex-1">
        <h1 className="text-base font-semibold">Home</h1>
        <div className="mt-4 rounded-md border bg-background px-4">
          {feed.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Follow people and star repositories to build your home feed.
            </p>
          ) : (
            feed.map((event) => <ActivityItem key={event.id} event={event} />)
          )}
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Trending repositories</h2>
          <div className="mt-3 rounded-md border px-4">
            {trending.map((repo) => (
              <RepoCard key={repo.id} repo={repo} variant="trending" />
            ))}
          </div>
        </section>
      </main>

      <aside className="hidden w-[300px] shrink-0 xl:block">
        <h2 className="text-sm font-semibold">Explore</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Repositories recommended from stars and public activity.
        </p>
        <div className="mt-3 space-y-3">
          {explore.map((repo) => (
            <RepoCard key={repo.id} repo={repo} variant="pinned" showOwner />
          ))}
        </div>
        <Link href="/search?q=react" className="mt-3 inline-block text-xs text-[#0969da] hover:underline">
          Explore more →
        </Link>
      </aside>
    </div>
  )
}
