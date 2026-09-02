"use client"

import Link from "next/link"
import { GitBranch, GitPullRequest, Tag } from "lucide-react"

import { AboutSidebar } from "@/components/github/about-sidebar"
import { BranchPicker } from "@/components/github/branch-picker"
import { CloneMenu } from "@/components/github/clone-menu"
import { FileTable } from "@/components/github/file-table"
import { GoToFile } from "@/components/github/go-to-file"
import { Markdown } from "@/components/github/markdown"
import { PathBreadcrumb } from "@/components/github/path-breadcrumb"
import { usePlatform } from "@/lib/platform/provider"
import { findOpenPull, gitLog, gitReadFiles } from "@/lib/platform/store"
import type { Repository } from "@/lib/platform/types"

export function RepoBrowser({
  repo,
  refName,
  treePath = "",
  branchCount,
  tagCount,
  showAbout = false,
}: {
  repo: Repository
  refName: string
  treePath?: string
  branchCount: number
  tagCount: number
  showAbout?: boolean
}) {
  usePlatform()
  const files = gitReadFiles(repo.id, refName)
  const readmePath = treePath ? `${treePath}/README.md` : "README.md"
  const readme = files[readmePath] ?? files[readmePath.replace(/README.md$/, "readme.md")]
  const onDefault = refName === repo.defaultBranch
  const existingPull = onDefault
    ? undefined
    : findOpenPull(repo.id, repo.defaultBranch, refName, repo.ownerLogin)
  const defaultShas = new Set(gitLog(repo.id, repo.defaultBranch).map((item) => item.sha))
  const ahead = onDefault
    ? 0
    : gitLog(repo.id, refName).filter((commit) => !defaultShas.has(commit.sha)).length

  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <BranchPicker
            owner={repo.ownerLogin}
            name={repo.name}
            repoId={repo.id}
            current={refName}
            treePath={treePath}
            mode="tree"
          />
          {treePath ? (
            <PathBreadcrumb
              owner={repo.ownerLogin}
              name={repo.name}
              refName={refName}
              path={treePath}
              kind="tree"
            />
          ) : (
            <div className="hidden items-center gap-3 text-sm sm:flex">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <GitBranch className="size-3.5" />
                <span className="font-semibold text-foreground">{branchCount}</span> branches
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Tag className="size-3.5" />
                <span className="font-semibold text-foreground">{tagCount}</span> tags
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!onDefault && treePath === "" ? (
              existingPull ? (
                <Link
                  href={`/${repo.ownerLogin}/${repo.name}/pull/${existingPull.number}`}
                  className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                >
                  <GitPullRequest className="size-3.5" />
                  View pull request
                </Link>
              ) : (
                <Link
                  href={`/${repo.ownerLogin}/${repo.name}/compare/${encodeURIComponent(repo.defaultBranch)}...${encodeURIComponent(refName)}`}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <GitPullRequest className="size-3.5" />
                  Compare & pull request
                  {ahead > 0 ? <span className="font-normal opacity-80">· {ahead}</span> : null}
                </Link>
              )
            ) : null}
            <GoToFile owner={repo.ownerLogin} name={repo.name} repoId={repo.id} refName={refName} />
            <CloneMenu repo={repo} />
          </div>
        </div>

        <FileTable
          owner={repo.ownerLogin}
          name={repo.name}
          repoId={repo.id}
          refName={refName}
          treePath={treePath}
        />

        {readme != null ? (
          <div id="readme" className="mt-4 overflow-hidden rounded-md border">
            <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">README.md</div>
            <div className="px-6 py-6">
              <Markdown source={readme} />
            </div>
          </div>
        ) : null}
      </div>
      {showAbout ? <AboutSidebar repo={repo} refName={refName} /> : null}
    </div>
  )
}
