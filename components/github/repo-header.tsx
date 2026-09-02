"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  BookMarked,
  CircleDot,
  Code2,
  Eye,
  GitFork,
  GitPullRequest,
  LayoutGrid,
  Play,
  Shield,
} from "lucide-react"

import { StarButton } from "@/components/github/star-button"
import { UnderlineNav } from "@/components/github/underline-nav"
import { VisibilityPill } from "@/components/github/repo-card"
import { Button } from "@/components/ui/button"
import { usePlatform } from "@/lib/platform/provider"
import {
  existingFork,
  forkCount,
  forkRepo,
  getRepoById,
  issueCount,
  isWatching,
  pullCount,
  toggleWatch,
  watchCount,
} from "@/lib/platform/store"
import type { Repository } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

export function RepoHeader({ repo }: { repo: Repository }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = usePlatform()
  const session = state.sessionLogin
  const parent = repo.parent ? getRepoById(repo.parent) : undefined
  const watching = isWatching(session, repo.id)
  const watches = watchCount(repo.id)
  const forks = forkCount(repo.id)
  const mine = existingFork(repo.id, session)
  const base = `/${repo.ownerLogin}/${repo.name}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ""
  const active = rest.startsWith("/issues")
    ? "issues"
    : rest.startsWith("/pull")
      ? "pulls"
      : rest.startsWith("/actions")
        ? "actions"
        : rest.startsWith("/projects")
          ? "projects"
          : rest.startsWith("/security")
            ? "security"
            : rest.startsWith("/insights")
              ? "insights"
              : "code"

  function onFork() {
    if (mine) {
      router.push(`/${mine.ownerLogin}/${mine.name}`)
      return
    }
    if (repo.ownerLogin === session) return
    try {
      const forked = forkRepo(repo.id)
      router.push(`/${forked.ownerLogin}/${forked.name}`)
    } catch {
      const again = existingFork(repo.id, session) ?? getRepoById(`${session}/${repo.name}`)
      if (again) router.push(`/${again.ownerLogin}/${again.name}`)
    }
  }

  return (
    <div className="border-b bg-muted/30">
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <BookMarked className="size-4 shrink-0 text-muted-foreground" />
              <h1 className="flex flex-wrap items-center gap-1 text-xl font-normal leading-tight">
                <Link href={`/${repo.ownerLogin}`} className="text-[#0969da] hover:underline">
                  {repo.ownerLogin}
                </Link>
                <span className="text-muted-foreground">/</span>
                <Link href={base} className="font-semibold text-[#0969da] hover:underline">
                  {repo.name}
                </Link>
              </h1>
              <VisibilityPill visibility={repo.visibility} />
            </div>
            {parent ? (
              <p className="mt-1 ml-6 text-xs text-muted-foreground">
                forked from{" "}
                <Link href={`/${parent.ownerLogin}/${parent.name}`} className="text-[#0969da] hover:underline">
                  {parent.id}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-md px-2 text-xs font-semibold"
              onClick={() => toggleWatch(repo.id)}
              aria-pressed={watching}
            >
              <Eye className={cn("size-3.5", watching ? "text-foreground" : "text-muted-foreground")} />
              <span>{watching ? "Unwatch" : "Watch"}</span>
              <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                {watches}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-md px-2 text-xs font-semibold"
              onClick={onFork}
              disabled={repo.ownerLogin === session && !mine}
            >
              <GitFork className="size-3.5 text-muted-foreground" />
              <span>{mine ? "Your fork" : "Fork"}</span>
              <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                {forks}
              </span>
            </Button>
            <StarButton repoId={repo.id} />
          </div>
        </div>
      </div>

      <div className="mt-3 px-2">
        <UnderlineNav
          tabs={[
            {
              href: base,
              label: "Code",
              icon: <Code2 className="size-4" />,
              active: active === "code",
            },
            {
              href: `${base}/issues`,
              label: "Issues",
              icon: <CircleDot className="size-4" />,
              count: issueCount(repo.id, "open"),
              active: active === "issues",
            },
            {
              href: `${base}/pulls`,
              label: "Pull requests",
              icon: <GitPullRequest className="size-4" />,
              count: pullCount(repo.id, "open"),
              active: active === "pulls",
            },
            {
              href: `${base}/actions`,
              label: "Actions",
              icon: <Play className="size-4" />,
              disabled: true,
            },
            {
              href: `${base}/projects`,
              label: "Projects",
              icon: <LayoutGrid className="size-4" />,
              disabled: true,
            },
            {
              href: `${base}/security`,
              label: "Security",
              icon: <Shield className="size-4" />,
              disabled: true,
            },
            {
              href: `${base}/insights`,
              label: "Insights",
              icon: <BarChart3 className="size-4" />,
              disabled: true,
            },
          ]}
        />
      </div>
    </div>
  )
}

export function RepoMissing({ owner, name }: { owner: string; name: string }) {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <h1 className="text-4xl font-light">404</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        There isn’t a GitHub repository named{" "}
        <span className="font-mono">
          {owner}/{name}
        </span>
        .
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-[#0969da] hover:underline">
        Go home
      </Link>
    </div>
  )
}
