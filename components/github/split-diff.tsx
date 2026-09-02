"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight, File as FileIcon, Folder } from "lucide-react"

import { DiffStats } from "@/components/github/diff-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { DiffHunk, FileDiff } from "@/lib/git"
import { cn } from "@/lib/utils"

type SplitRow = {
  leftNum: number | null
  rightNum: number | null
  leftText: string
  rightText: string
  leftType: "context" | "del" | "empty"
  rightType: "context" | "add" | "empty"
}

type TreeNode = {
  name: string
  path: string
  children?: TreeNode[]
  file?: FileDiff
}

function hunkToSplit(hunk: DiffHunk): SplitRow[] {
  const rows: SplitRow[] = []
  let i = 0
  let oldLine = hunk.oldStart
  let newLine = hunk.newStart
  while (i < hunk.lines.length) {
    const line = hunk.lines[i]
    if (line.type === "context") {
      rows.push({
        leftNum: oldLine++,
        rightNum: newLine++,
        leftText: line.text,
        rightText: line.text,
        leftType: "context",
        rightType: "context",
      })
      i++
      continue
    }
    const dels: string[] = []
    const adds: string[] = []
    while (i < hunk.lines.length && hunk.lines[i].type === "del") {
      dels.push(hunk.lines[i].text)
      i++
    }
    while (i < hunk.lines.length && hunk.lines[i].type === "add") {
      adds.push(hunk.lines[i].text)
      i++
    }
    const n = Math.max(dels.length, adds.length)
    for (let k = 0; k < n; k++) {
      rows.push({
        leftNum: k < dels.length ? oldLine++ : null,
        rightNum: k < adds.length ? newLine++ : null,
        leftText: dels[k] ?? "",
        rightText: adds[k] ?? "",
        leftType: k < dels.length ? "del" : "empty",
        rightType: k < adds.length ? "add" : "empty",
      })
    }
  }
  return rows
}

function fileTree(diffs: FileDiff[]): TreeNode[] {
  const root: TreeNode[] = []
  function insert(parts: string[], file: FileDiff, nodes: TreeNode[], prefix: string) {
    const [head, ...rest] = parts
    if (!head) return
    const path = prefix ? `${prefix}/${head}` : head
    if (rest.length === 0) {
      nodes.push({ name: head, path, file })
      return
    }
    let folder = nodes.find((node) => node.name === head && node.children)
    if (!folder) {
      folder = { name: head, path, children: [] }
      nodes.push(folder)
    }
    insert(rest, file, folder.children!, path)
  }
  for (const diff of diffs) insert(diff.path.split("/"), diff, root, "")
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      const aDir = a.children ? 0 : 1
      const bDir = b.children ? 0 : 1
      if (aDir !== bDir) return aDir - bDir
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) if (node.children) sortNodes(node.children)
  }
  sortNodes(root)
  return root
}

function statusMark(status: FileDiff["status"]) {
  if (status === "added") return <span className="font-mono text-[10px] gh-open">A</span>
  if (status === "deleted") return <span className="font-mono text-[10px] gh-closed">D</span>
  return <span className="font-mono text-[10px] text-amber-700">M</span>
}

function FileTreeNodes({
  nodes,
  active,
  onSelect,
  depth = 0,
}: {
  nodes: TreeNode[]
  active: string | null
  onSelect: (path: string) => void
  depth?: number
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} active={active} onSelect={onSelect} depth={depth} />
      ))}
    </ul>
  )
}

function TreeItem({
  node,
  active,
  onSelect,
  depth,
}: {
  node: TreeNode
  active: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const [open, setOpen] = useState(true)
  if (node.children) {
    return (
      <li>
        <button
          type="button"
          className="flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-muted"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <Folder className="size-3.5 text-muted-foreground" />
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open ? <FileTreeNodes nodes={node.children} active={active} onSelect={onSelect} depth={depth + 1} /> : null}
      </li>
    )
  }
  return (
    <li>
      <a
        href={`#diff-${node.path}`}
        onClick={(event) => {
          event.preventDefault()
          onSelect(node.path)
          document.getElementById(`diff-${node.path}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        className={cn(
          "flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-xs hover:bg-muted",
          active === node.path && "bg-muted",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <FileIcon className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.file ? statusMark(node.file.status) : null}
      </a>
    </li>
  )
}

function SplitFile({ file }: { file: FileDiff }) {
  return (
    <div id={`diff-${file.path}`} className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
        <FileIcon className="size-4 text-muted-foreground" />
        <span className="font-mono text-xs font-medium">{file.path}</span>
        <span className="ml-auto text-xs">
          <span className="gh-open">+{file.additions}</span>{" "}
          <span className="gh-closed">−{file.deletions}</span>
        </span>
      </div>
      <div className="overflow-x-auto font-mono text-xs leading-5">
        {file.hunks.length === 0 ? (
          <p className="px-3 py-3 text-muted-foreground">No textual diff.</p>
        ) : (
          file.hunks.map((hunk, hunkIndex) => (
            <table key={hunkIndex} className="w-full table-fixed">
              <tbody>
                <tr className="bg-[#ddf4ff] text-[#0969da]">
                  <td className="w-12 px-2 text-right select-none"> </td>
                  <td className="w-[50%] px-2 whitespace-pre">
                    @@ −{hunk.oldStart},{hunk.oldLines} @@
                  </td>
                  <td className="w-12 px-2 text-right select-none"> </td>
                  <td className="w-[50%] px-2 whitespace-pre">
                    @@ +{hunk.newStart},{hunk.newLines} @@
                  </td>
                </tr>
                {hunkToSplit(hunk).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="w-12 border-r bg-muted/20 px-1 text-right text-muted-foreground select-none">
                      {row.leftNum ?? ""}
                    </td>
                    <td
                      className={cn(
                        "whitespace-pre px-2",
                        row.leftType === "del" && "gh-del-bg",
                        row.leftType === "empty" && "bg-muted/30",
                      )}
                    >
                      {row.leftType === "del" ? `− ${row.leftText}` : row.leftType === "context" ? `  ${row.leftText}` : ""}
                    </td>
                    <td className="w-12 border-r bg-muted/20 px-1 text-right text-muted-foreground select-none">
                      {row.rightNum ?? ""}
                    </td>
                    <td
                      className={cn(
                        "whitespace-pre px-2",
                        row.rightType === "add" && "gh-add-bg",
                        row.rightType === "empty" && "bg-muted/30",
                      )}
                    >
                      {row.rightType === "add" ? `+ ${row.rightText}` : row.rightType === "context" ? `  ${row.rightText}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
      </div>
    </div>
  )
}

export function SplitDiffView({
  diffs,
  reviewSlot,
}: {
  diffs: FileDiff[]
  reviewSlot?: ReactNode
}) {
  const [filter, setFilter] = useState("")
  const [active, setActive] = useState<string | null>(diffs[0]?.path ?? null)
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return diffs
    return diffs.filter((file) => file.path.toLowerCase().includes(q))
  }, [diffs, filter])
  const tree = useMemo(() => fileTree(filtered), [filtered])

  if (diffs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No files changed.</p>
  }

  return (
    <div className="flex gap-4">
      <aside className="hidden w-[240px] shrink-0 xl:block">
        <div className="sticky top-20 rounded-md border bg-muted/30">
          <div className="border-b p-2">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter files"
              className="h-7 bg-background text-xs"
            />
          </div>
          <ScrollArea className="h-[min(70vh,640px)] p-1">
            <FileTreeNodes nodes={tree} active={active} onSelect={setActive} />
          </ScrollArea>
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DiffStats diffs={diffs} />
          {reviewSlot}
        </div>
        {filtered.map((file) => (
          <SplitFile key={file.path} file={file} />
        ))}
      </div>
    </div>
  )
}

export function ReviewChangesButton({ onComment }: { onComment: (body: string) => void }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
        Review changes
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">Finish your review</p>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="Leave a comment"
          className="mt-2 min-h-24"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!body.trim()}
            onClick={() => {
              onComment(body.trim())
              setBody("")
              setOpen(false)
            }}
          >
            Comment
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
