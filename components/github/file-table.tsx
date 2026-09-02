"use client"

import { useMemo } from "react"
import Link from "next/link"
import { File, Folder, History } from "lucide-react"

import { UserAvatar } from "@/components/github/user-avatar"
import { usePlatform } from "@/lib/platform/provider"
import {
  commitSubject,
  gitLog,
  gitLsTree,
  lastCommitsForPaths,
  loginFromIdent,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import { cn } from "@/lib/utils"

export function FileTable({
  owner,
  name,
  repoId,
  refName,
  treePath = "",
}: {
  owner: string
  name: string
  repoId: string
  refName: string
  treePath?: string
}) {
  const { rev } = usePlatform()
  const commits = useMemo(() => gitLog(repoId, refName), [repoId, refName, rev])
  const entries = useMemo(() => {
    const raw = gitLsTree(repoId, refName, treePath)
    return [...raw].sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [repoId, refName, treePath, rev])
  const prefix = treePath ? `${treePath}/` : ""
  const lastByPath = useMemo(() => {
    const paths = entries.map((entry) => `${prefix}${entry.name}`)
    if (treePath) paths.push(treePath)
    return lastCommitsForPaths(repoId, refName, paths)
  }, [repoId, refName, entries, prefix, treePath, rev])
  const latest = (treePath ? lastByPath.get(treePath) : commits[0]) ?? commits[0]

  const base = `/${owner}/${name}`
  const refSeg = encodeURIComponent(refName)

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-2 bg-muted/50 px-3 py-2 text-sm">
        {latest ? (
          <>
            <UserAvatar login={loginFromIdent(latest.author)} className="size-5" linked />
            <Link
              href={`/${loginFromIdent(latest.author)}`}
              className="font-semibold hover:text-[#0969da] hover:underline"
            >
              {loginFromIdent(latest.author)}
            </Link>
            <Link
              href={`${base}/commit/${latest.sha}`}
              className="min-w-0 flex-1 truncate text-muted-foreground hover:text-[#0969da] hover:underline"
            >
              {commitSubject(latest.message)}
            </Link>
            <Link
              href={`${base}/commit/${latest.sha}`}
              className="hidden font-mono text-xs text-muted-foreground hover:text-[#0969da] hover:underline sm:inline"
            >
              {shortSha(latest.sha)}
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              <RelativeTime at={latest.author.timestamp} />
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">This branch doesn’t have any commits yet.</span>
        )}
        <Link
          href={`${base}/commits/${refSeg}`}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-[#0969da]"
        >
          <History className="size-3.5" />
          {commits.length} commit{commits.length === 1 ? "" : "s"}
        </Link>
      </div>
      <ul>
        {entries.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">This directory is empty.</li>
        ) : (
          entries.map((entry) => {
            const path = `${prefix}${entry.name}`
            const href =
              entry.type === "tree"
                ? `${base}/tree/${refSeg}/${path}`
                : `${base}/blob/${refSeg}/${path}`
            const last = lastByPath.get(path)
            return (
              <li
                key={entry.name}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-t px-3 py-2 text-sm hover:bg-muted/40"
              >
                <Link href={href} className="flex min-w-0 items-center gap-2 hover:text-[#0969da] hover:underline">
                  {entry.type === "tree" ? (
                    <Folder className="size-4 shrink-0 fill-[#54aeff] text-[#54aeff]" />
                  ) : (
                    <File className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn("truncate font-mono text-[13px]", entry.type === "tree" && "font-medium")}>
                    {entry.name}
                  </span>
                </Link>
                {last ? (
                  <Link
                    href={`${base}/commit/${last.sha}`}
                    className="hidden truncate text-xs text-muted-foreground hover:text-[#0969da] hover:underline md:block"
                  >
                    {commitSubject(last.message)}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-right text-xs whitespace-nowrap text-muted-foreground">
                  {last ? <RelativeTime at={last.author.timestamp} /> : ""}
                </span>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
