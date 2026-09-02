"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { BookMarked, Building2, Link2, MapPin, Star, Users } from "lucide-react"

import { ActivityItem } from "@/components/github/activity-item"
import { ContributionHeatmap } from "@/components/github/heatmap"
import { RepoCard } from "@/components/github/repo-card"
import { UnderlineNav } from "@/components/github/underline-nav"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePlatform } from "@/lib/platform/provider"
import {
  contributionHeatmap,
  isFollowing,
  listActivity,
  listRepos,
  pinnedRepos,
  starredRepos,
  toggleFollow,
} from "@/lib/platform/store"

function ProfilePage() {
  const { owner } = useParams<{ owner: string }>()
  const search = useSearchParams()
  const { state } = usePlatform()
  const login = decodeURIComponent(owner ?? "")
  const tab = search.get("tab") ?? "overview"
  const [repoQuery, setRepoQuery] = useState("")
  const [starQuery, setStarQuery] = useState("")

  const user = state.users.find((item) => item.login === login)
  const org = state.orgs.find((item) => item.login === login)
  const actor = user ?? org
  const session = state.sessionLogin
  const following = user ? isFollowing(login, session) : false

  const repos = useMemo(() => listRepos(login), [state, login])
  const stars = useMemo(() => (user ? starredRepos(login) : []), [state, login, user])
  const pinned = useMemo(() => pinnedRepos(login, 6), [state, login])
  const heatmap = useMemo(() => (user ? contributionHeatmap(login) : []), [state, login, user])
  const activity = useMemo(() => listActivity(login), [state, login])

  if (!actor) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-24 text-center">
        <h1 className="text-4xl font-light">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          There isn’t a GitHub user or organization named <span className="font-mono">{login}</span>.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-[#0969da] hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  const filteredRepos = repoQuery.trim()
    ? repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(repoQuery.toLowerCase()) ||
          repo.description.toLowerCase().includes(repoQuery.toLowerCase()),
      )
    : repos
  const filteredStars = starQuery.trim()
    ? stars.filter(
        (repo) =>
          repo.id.toLowerCase().includes(starQuery.toLowerCase()) ||
          repo.description.toLowerCase().includes(starQuery.toLowerCase()),
      )
    : stars

  const isSelf = session === login

  return (
    <div>
      <div className="border-b">
        <div className="mx-auto max-w-[1280px] px-4">
          <UnderlineNav
            tabs={[
              {
                href: `/${login}`,
                label: "Overview",
                icon: <BookMarked className="size-4" />,
                active: tab === "overview",
              },
              {
                href: `/${login}?tab=repositories`,
                label: "Repositories",
                icon: <BookMarked className="size-4" />,
                count: repos.length,
                active: tab === "repositories",
              },
              {
                href: `/${login}?tab=stars`,
                label: "Stars",
                icon: <Star className="size-4" />,
                count: stars.length,
                active: tab === "stars",
              },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-6 md:grid-cols-[296px_minmax(0,1fr)]">
        <aside>
          <UserAvatar
            login={login}
            className="aspect-square size-auto w-full max-w-[296px] ring-1 ring-black/10"
            fallbackClassName="text-5xl"
          />
          <h1 className="mt-4 text-2xl font-semibold leading-tight">{actor.name}</h1>
          <p className="text-xl font-light text-muted-foreground">{actor.login}</p>

          {user && !isSelf && (
            <Button
              type="button"
              variant={following ? "outline" : "secondary"}
              className="mt-4 w-full"
              onClick={() => toggleFollow(login)}
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
          {isSelf && (
            <Button type="button" variant="outline" className="mt-4 w-full" disabled>
              Edit profile
            </Button>
          )}

          {actor.bio ? <p className="mt-4 text-sm">{actor.bio}</p> : null}

          {user ? (
            <div className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <Users className="size-4" />
              <span>
                <span className="font-semibold text-foreground">{user.followers.length}</span> followers
              </span>
              <span>·</span>
              <span>
                <span className="font-semibold text-foreground">{user.following.length}</span> following
              </span>
            </div>
          ) : org ? (
            <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="size-4" />
              {org.members.length} member{org.members.length === 1 ? "" : "s"}
            </div>
          ) : null}

          <ul className="mt-3 space-y-1.5 text-sm">
            {actor.company ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4 shrink-0" />
                {actor.company}
              </li>
            ) : null}
            {actor.location ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {actor.location}
              </li>
            ) : null}
            {actor.website ? (
              <li className="flex items-center gap-2">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={actor.website}
                  className="truncate text-[#0969da] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {actor.website.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ) : null}
          </ul>

          {org && org.members.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">People</h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {org.members.map((member) => (
                  <UserAvatar key={member} login={member} className="size-8" linked />
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          {tab === "overview" && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 text-base">Pinned</h2>
                {pinned.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {login} doesn’t have any public repositories yet.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pinned.map((repo) => (
                      <RepoCard key={repo.id} repo={repo} variant="pinned" showOwner={repo.ownerLogin !== login} />
                    ))}
                  </div>
                )}
              </section>

              {user ? <ContributionHeatmap days={heatmap} /> : null}

              <section>
                <h2 className="mb-3 text-base">Contribution activity</h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {login} doesn’t have any activity yet.
                  </p>
                ) : (
                  <div className="rounded-md border px-4">
                    {activity.map((event) => (
                      <ActivityItem key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "repositories" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={repoQuery}
                  onChange={(event) => setRepoQuery(event.target.value)}
                  placeholder="Find a repository..."
                  className="max-w-md"
                />
                {isSelf && (
                  <Link
                    href="/new"
                    className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    New
                  </Link>
                )}
              </div>
              {filteredRepos.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {login} doesn’t have any repositories that match.
                </p>
              ) : (
                filteredRepos.map((repo) => <RepoCard key={repo.id} repo={repo} variant="row" />)
              )}
            </div>
          )}

          {tab === "stars" && (
            <div>
              <Input
                value={starQuery}
                onChange={(event) => setStarQuery(event.target.value)}
                placeholder="Search stars..."
                className="max-w-md"
              />
              {filteredStars.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {login} doesn’t have any starred repositories yet.
                </p>
              ) : (
                filteredStars.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} variant="row" showOwner />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1280px] px-4 py-10 text-sm text-muted-foreground">Loading profile…</div>
      }
    >
      <ProfilePage />
    </Suspense>
  )
}
