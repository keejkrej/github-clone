"use client"

import { useParams } from "next/navigation"

import { BlobView } from "@/components/github/blob-view"
import { usePlatform } from "@/lib/platform/provider"
import { getRepo, gitResolveRef } from "@/lib/platform/store"

export default function RepoBlobPage() {
  const params = useParams<{ owner: string; repo: string; path: string[] }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const segments = (params.path ?? []).map((part) => decodeURIComponent(part))
  const refName = segments[0] ?? ""
  const filePath = segments.slice(1).join("/")
  const repo = getRepo(owner, name)
  if (!repo) return null
  if (!refName || !filePath || !gitResolveRef(repo.id, refName)) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-muted-foreground">
        File not found.
      </div>
    )
  }
  return <BlobView repo={repo} refName={refName} filePath={filePath} />
}
