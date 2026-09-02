"use client"

import { useParams } from "next/navigation"

import { RepoHeader, RepoMissing } from "@/components/github/repo-header"
import { usePlatform } from "@/lib/platform/provider"
import { getRepo } from "@/lib/platform/store"

export default function RepoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ owner: string; repo: string }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  if (!repo) {
    return <RepoMissing owner={owner} name={name} />
  }
  return (
    <>
      <RepoHeader repo={repo} />
      {children}
    </>
  )
}
