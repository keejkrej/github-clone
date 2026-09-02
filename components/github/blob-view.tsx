"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Check, Copy, History } from "lucide-react"

import { BranchPicker } from "@/components/github/branch-picker"
import { GoToFile } from "@/components/github/go-to-file"
import { PathBreadcrumb } from "@/components/github/path-breadcrumb"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import {
  commitSubject,
  gitReadFiles,
  lastCommitsForPaths,
  loginFromIdent,
  shortSha,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"
import { usePlatform } from "@/lib/platform/provider"
import type { Repository } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

export function BlobView({
  repo,
  refName,
  filePath,
}: {
  repo: Repository
  refName: string
  filePath: string
}) {
  const { rev } = usePlatform()
  const [raw, setRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const latest = useMemo(
    () => lastCommitsForPaths(repo.id, refName, [filePath]).get(filePath),
    [repo.id, refName, filePath, rev],
  )
  const content = useMemo(() => gitReadFiles(repo.id, refName)[filePath], [repo.id, refName, filePath, rev])

  if (content == null) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-muted-foreground">
        File not found on this branch.
      </div>
    )
  }

  const lines = content === "" ? [""] : content.split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  const bytes = new TextEncoder().encode(content).length
  const base = `/${repo.ownerLogin}/${repo.name}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BranchPicker
          owner={repo.ownerLogin}
          name={repo.name}
          repoId={repo.id}
          current={refName}
          treePath={filePath}
          mode="blob"
        />
        <PathBreadcrumb
          owner={repo.ownerLogin}
          name={repo.name}
          refName={refName}
          path={filePath}
          kind="blob"
        />
        <div className="ml-auto">
          <GoToFile owner={repo.ownerLogin} name={repo.name} repoId={repo.id} refName={refName} />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
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
              <span className="text-xs text-muted-foreground">
                Latest commit {shortSha(latest.sha)} <RelativeTime at={latest.author.timestamp} />
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No commit history for this file.</span>
          )}
          <Link
            href={`${base}/commits/${encodeURIComponent(refName)}`}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-[#0969da]"
          >
            <History className="size-3.5" />
            History
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {lines.length} line{lines.length === 1 ? "" : "s"} · {bytes} Bytes
          </span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="xs" onClick={() => setRaw((value) => !value)}>
              {raw ? "Code" : "Raw"}
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={copy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              Copy
            </Button>
            <Link
              href={`${base}/commits/${encodeURIComponent(refName)}`}
              className="inline-flex h-6 items-center rounded-[min(var(--radius-md),10px)] border px-2 text-xs font-medium hover:bg-muted"
            >
              History
            </Link>
          </div>
        </div>

        {raw ? (
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-5">{content}</pre>
        ) : (
          <table className="w-full font-mono text-xs leading-5">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="hover:bg-muted/40">
                  <td
                    id={`L${index + 1}`}
                    className="w-12 select-none border-r px-2 text-right text-muted-foreground"
                  >
                    <a href={`#L${index + 1}`} className="hover:text-[#0969da]">
                      {index + 1}
                    </a>
                  </td>
                  <td className={cn("whitespace-pre px-4", line === "" && "h-5")}>{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
