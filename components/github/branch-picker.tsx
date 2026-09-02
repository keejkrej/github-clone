"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, GitBranch, Tag } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { listBranches, listTags } from "@/lib/platform/store"
import { cn } from "@/lib/utils"

export function BranchPicker({
  owner,
  name,
  repoId,
  current,
  treePath = "",
  mode = "tree",
}: {
  owner: string
  name: string
  repoId: string
  current: string
  treePath?: string
  mode?: "tree" | "blob" | "commits"
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const branches = listBranches(repoId)
  const tags = listTags(repoId)
  const q = query.trim().toLowerCase()
  const filteredBranches = useMemo(
    () => (q ? branches.filter((item) => item.toLowerCase().includes(q)) : branches),
    [branches, q],
  )
  const filteredTags = useMemo(
    () => (q ? tags.filter((item) => item.toLowerCase().includes(q)) : tags),
    [tags, q],
  )

  function go(ref: string) {
    const refSeg = encodeURIComponent(ref)
    const suffix = treePath ? `/${treePath}` : ""
    if (mode === "commits") router.push(`/${owner}/${name}/commits/${refSeg}`)
    else if (mode === "blob") router.push(`/${owner}/${name}/blob/${refSeg}${suffix}`)
    else router.push(treePath ? `/${owner}/${name}/tree/${refSeg}${suffix}` : `/${owner}/${name}/tree/${refSeg}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border bg-muted/40 px-2 text-sm font-semibold hover:bg-muted">
        <GitBranch className="size-3.5 text-muted-foreground" />
        <span className="max-w-[160px] truncate">{current}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 min-w-72 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a branch..."
          className="h-8"
        />
        <div className="mt-2 max-h-72 overflow-y-auto">
          <div className="px-1 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Branches
          </div>
          {filteredBranches.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Nothing to show</p>
          ) : (
            filteredBranches.map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => go(branch)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <GitBranch className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{branch}</span>
                {branch === current ? <Check className="size-3.5" /> : null}
              </button>
            ))
          )}
          {filteredTags.length > 0 ? (
            <>
              <div className="mt-2 px-1 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Tags
              </div>
              {filteredTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => go(tag)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Tag className="size-3.5 text-muted-foreground" />
                  <span className={cn("min-w-0 flex-1 truncate font-medium")}>{tag}</span>
                  {tag === current ? <Check className="size-3.5" /> : null}
                </button>
              ))}
            </>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
