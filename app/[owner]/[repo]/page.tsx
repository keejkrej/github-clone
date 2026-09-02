"use client"

import { useParams } from "next/navigation"

import { RepoBrowser } from "@/components/github/repo-browser"
import { usePlatform } from "@/lib/platform/provider"
import { getRepo, listBranches, listTags } from "@/lib/platform/store"

export default function RepoCodePage() {
  const params = useParams<{ owner: string; repo: string }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  if (!repo) return null
  return (
    <RepoBrowser
      repo={repo}
      refName={repo.defaultBranch}
      showAbout
      branchCount={listBranches(repo.id).length}
      tagCount={listTags(repo.id).length}
    />
  )
}
