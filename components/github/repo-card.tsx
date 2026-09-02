"use client"

import Link from "next/link"
import { BookMarked, GitFork, Star } from "lucide-react"

import { StarButton } from "@/components/github/star-button"
import { Badge } from "@/components/ui/badge"
import { usePlatform } from "@/lib/platform/provider"
import {
  forkCount,
  primaryLanguage,
  starCount,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import type { Repository } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

export function LanguageDot({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  if (!name) return null
  const color =
    name === "TypeScript"
      ? "gh-lang-ts"
      : name === "JavaScript"
        ? "gh-lang-js"
        : name === "Python"
          ? "gh-lang-python"
          : name === "Go"
            ? "gh-lang-go"
            : name === "CSS"
              ? "gh-lang-css"
              : name === "Rust"
                ? "gh-lang-rust"
                : "bg-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span className={cn("size-2.5 rounded-full", color)} />
      {name}
    </span>
  )
}

export function VisibilityPill({ visibility }: { visibility: Repository["visibility"] }) {
  return (
    <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[11px] font-medium text-muted-foreground">
      {visibility === "private" ? "Private" : "Public"}
    </Badge>
  )
}

export function RepoCard({
  repo,
  variant = "pinned",
  showOwner = false,
}: {
  repo: Repository
  variant?: "pinned" | "row" | "trending"
  showOwner?: boolean
}) {
  usePlatform()
  const lang = primaryLanguage(repo.id)
  const stars = starCount(repo.id)
  const forks = forkCount(repo.id)
  const title = showOwner ? repo.id : repo.name

  if (variant === "row") {
    return (
      <div className="flex flex-col gap-2 border-b py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${repo.ownerLogin}/${repo.name}`}
              className="text-xl font-semibold text-[#0969da] hover:underline"
            >
              {title}
            </Link>
            <VisibilityPill visibility={repo.visibility} />
          </div>
          {repo.description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{repo.description}</p>
          ) : null}
          {repo.topics.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {repo.topics.map((topic) => (
                <Link
                  key={topic}
                  href={`/search?q=${encodeURIComponent(topic)}`}
                  className="rounded-full bg-[#ddf4ff] px-2.5 py-0.5 text-xs font-medium text-[#0969da] hover:bg-[#0969da] hover:text-white"
                >
                  {topic}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <LanguageDot name={lang?.name} />
            {stars > 0 && (
              <Link href={`/${repo.ownerLogin}/${repo.name}`} className="inline-flex items-center gap-1 hover:text-[#0969da]">
                <Star className="size-3.5" />
                {stars}
              </Link>
            )}
            {forks > 0 && (
              <span className="inline-flex items-center gap-1">
                <GitFork className="size-3.5" />
                {forks}
              </span>
            )}
            <span>
              Updated <RelativeTime at={repo.pushedAt} />
            </span>
          </div>
        </div>
        <StarButton repoId={repo.id} className="self-start" />
      </div>
    )
  }

  if (variant === "trending") {
    return (
      <div className="flex gap-3 border-b py-4 last:border-b-0">
        <BookMarked className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/${repo.ownerLogin}/${repo.name}`}
              className="font-semibold text-[#0969da] hover:underline"
            >
              {repo.ownerLogin}
              <span className="font-normal text-muted-foreground"> / </span>
              {repo.name}
            </Link>
            <StarButton repoId={repo.id} />
          </div>
          {repo.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{repo.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <LanguageDot name={lang?.name} />
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5" />
              {stars}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-md border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BookMarked className="size-4 shrink-0 text-muted-foreground" />
          <Link
            href={`/${repo.ownerLogin}/${repo.name}`}
            className="truncate text-sm font-semibold text-[#0969da] hover:underline"
          >
            {showOwner ? repo.id : repo.name}
          </Link>
        </div>
        <VisibilityPill visibility={repo.visibility} />
      </div>
      {repo.description ? (
        <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">{repo.description}</p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LanguageDot name={lang?.name} />
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5" />
          {stars}
        </span>
        {forks > 0 && (
          <span className="inline-flex items-center gap-1">
            <GitFork className="size-3.5" />
            {forks}
          </span>
        )}
      </div>
    </div>
  )
}
