"use client"

import Link from "next/link"
import { BookOpen, Eye, GitFork, Link2, Scale, Star } from "lucide-react"

import { LanguageDot } from "@/components/github/repo-card"
import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import {
  forkCount,
  repoContributors,
  repoLanguages,
  starCount,
  watchCount,
} from "@/lib/platform/store"
import type { Repository } from "@/lib/platform/types"

export function AboutSidebar({ repo, refName }: { repo: Repository; refName: string }) {
  usePlatform()
  const stars = starCount(repo.id)
  const watches = watchCount(repo.id)
  const forks = forkCount(repo.id)
  const contributors = repoContributors(repo.id, refName)
  const langs = repoLanguages(repo.id)
  const total = langs.reduce((sum, lang) => sum + lang.bytes, 0) || 1
  const base = `/${repo.ownerLogin}/${repo.name}`
  const refSeg = encodeURIComponent(refName)

  return (
    <aside className="hidden w-[296px] shrink-0 xl:block">
      <h2 className="text-base font-semibold">About</h2>
      <p className="mt-2 text-sm">{repo.description || "No description provided."}</p>
      {repo.website ? (
        <a
          href={repo.website}
          className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#0969da] hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <Link2 className="size-4 text-muted-foreground" />
          {repo.website.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
      {repo.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
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

      <ul className="mt-4 space-y-1.5 border-b pb-4 text-sm text-muted-foreground">
        <li>
          <a href="#readme" className="inline-flex items-center gap-2 hover:text-[#0969da] hover:underline">
            <BookOpen className="size-4" />
            README
          </a>
        </li>
        {repo.license ? (
          <li>
            <Link
              href={`${base}/blob/${refSeg}/LICENSE`}
              className="inline-flex items-center gap-2 hover:text-[#0969da] hover:underline"
            >
              <Scale className="size-4" />
              {repo.license} license
            </Link>
          </li>
        ) : null}
      </ul>

      <ul className="space-y-1.5 border-b py-4 text-sm">
        <li>
          <Link href={base} className="inline-flex items-center gap-2 hover:text-[#0969da]">
            <Star className="size-4 text-muted-foreground" />
            <span className="font-semibold">{stars}</span>
            <span className="text-muted-foreground">stars</span>
          </Link>
        </li>
        <li>
          <span className="inline-flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <span className="font-semibold">{watches}</span>
            <span className="text-muted-foreground">watching</span>
          </span>
        </li>
        <li>
          <span className="inline-flex items-center gap-2">
            <GitFork className="size-4 text-muted-foreground" />
            <span className="font-semibold">{forks}</span>
            <span className="text-muted-foreground">forks</span>
          </span>
        </li>
      </ul>

      <div className="border-b py-4">
        <h3 className="text-sm font-semibold">Releases</h3>
        <p className="mt-2 text-sm text-muted-foreground">No releases published</p>
      </div>

      <div className="border-b py-4">
        <h3 className="text-sm font-semibold">Contributors</h3>
        {contributors.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No contributors yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {contributors.slice(0, 12).map((person) => (
              <UserAvatar key={person.login} login={person.login} className="size-8" linked />
            ))}
          </div>
        )}
        {contributors.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {contributors.length} contributor{contributors.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="py-4">
        <h3 className="text-sm font-semibold">Languages</h3>
        {langs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No languages detected.</p>
        ) : (
          <>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full">
              {langs.map((lang) => (
                <span
                  key={lang.name}
                  className={lang.colorClass}
                  style={{ width: `${(lang.bytes / total) * 100}%` }}
                  title={lang.name}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {langs.map((lang) => (
                <li key={lang.name} className="flex items-center gap-1 text-xs">
                  <LanguageDot name={lang.name} />
                  <span className="text-muted-foreground">{((lang.bytes / total) * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
