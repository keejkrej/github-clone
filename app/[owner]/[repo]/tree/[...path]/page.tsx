"use client"

import { useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { RepoBrowser } from "@/components/github/repo-browser"
import { usePlatform } from "@/lib/platform/provider"
import { getRepo, gitLsTree, gitResolveRef, listBranches, listTags } from "@/lib/platform/store"

export default function RepoTreePage() {
  const params = useParams<{ owner: string; repo: string; path: string[] }>()
  const router = useRouter()
  const { rev } = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const segments = (params.path ?? []).map((part) => decodeURIComponent(part))
  const refName = segments[0] ?? ""
  const treePath = segments.slice(1).join("/")
  const repo = getRepo(owner, name)
  const resolved = repo && refName ? gitResolveRef(repo.id, refName) : null
  const entries = useMemo(() => {
    if (!repo || !resolved) return []
    return gitLsTree(repo.id, refName, treePath)
  }, [repo, resolved, refName, treePath, rev])
  const blobHref = `/${owner}/${name}/blob/${segments.map(encodeURIComponent).join("/")}`
  const isBlob =
    Boolean(treePath) &&
    entries.length === 1 &&
    entries[0].type === "blob" &&
    entries[0].name === segments[segments.length - 1]

  useEffect(() => {
    if (!isBlob) return
    router.replace(blobHref)
  }, [isBlob, blobHref, router])

  if (!repo) return null
  if (!refName || !resolved) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-center text-sm text-muted-foreground">
        This is not a valid ref.
      </div>
    )
  }
  if (isBlob) return null

  return (
    <RepoBrowser
      repo={repo}
      refName={refName}
      treePath={treePath}
      showAbout={treePath === ""}
      branchCount={listBranches(repo.id).length}
      tagCount={listTags(repo.id).length}
    />
  )
}
