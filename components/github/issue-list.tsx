"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Milestone, Search, Tag } from "lucide-react"

import { IssueRow, StateFilters } from "@/components/github/issue-row"
import { LabelPill } from "@/components/github/label-pill"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { usePlatform } from "@/lib/platform/provider"
import { listIssues, listLabels, listPulls } from "@/lib/platform/store"
import type { Issue, PullRequest, Repository } from "@/lib/platform/types"

type Kind = "issue" | "pull"
type SortKey = "newest" | "oldest" | "comments"

function parseQuery(q: string): { state: "open" | "closed" | "all"; author?: string; labels: string[]; text: string } {
  let status: "open" | "closed" | "all" = "all"
  let author: string | undefined
  const labels: string[] = []
  const rest: string[] = []
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (token === "is:open") status = "open"
    else if (token === "is:closed") status = "closed"
    else if (token.startsWith("author:")) author = token.slice("author:".length)
    else if (token.startsWith("label:")) labels.push(token.slice("label:".length))
    else rest.push(token)
  }
  return { state: status, author, labels, text: rest.join(" ").toLowerCase() }
}

function setToken(q: string, prefix: string, value: string | null): string {
  const tokens = q.split(/\s+/).filter((token) => token && !token.startsWith(prefix))
  if (value) tokens.unshift(`${prefix}${value}`)
  return tokens.join(" ").trim()
}

export function IssueList({ repo, kind }: { repo: Repository; kind: Kind }) {
  const { state } = usePlatform()
  const [query, setQuery] = useState("is:open")
  const [sort, setSort] = useState<SortKey>("newest")
  const parsed = parseQuery(query)
  const status: "open" | "closed" = parsed.state === "closed" ? "closed" : "open"
  const labels = listLabels(repo.id)

  const all = useMemo(() => {
    return kind === "pull" ? listPulls(repo.id, { state: "all" }) : listIssues(repo.id, { state: "all" })
  }, [state, repo.id, kind])

  const openCount = all.filter((item) => item.state === "open" && !(kind === "pull" && "merged" in item && item.merged)).length
  const closedCount = all.filter((item) => item.state === "closed" || (kind === "pull" && "merged" in item && item.merged)).length

  const items = useMemo(() => {
    const filtered = all.filter((item) => {
      const merged = kind === "pull" && "merged" in item && item.merged
      if (status === "open") {
        if (item.state !== "open" || merged) return false
      } else if (item.state !== "closed" && !merged) {
        return false
      }
      if (parsed.author && item.author !== parsed.author) return false
      if (parsed.labels.length && !parsed.labels.every((name) => item.labels.includes(name))) return false
      if (parsed.text && !item.title.toLowerCase().includes(parsed.text)) return false
      return true
    })
    filtered.sort((a, b) => {
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt)
      if (sort === "comments") return b.comments.length - a.comments.length
      return b.createdAt.localeCompare(a.createdAt)
    })
    return filtered
  }, [all, kind, parsed.author, parsed.labels, parsed.text, sort, status])

  const authors = [...new Set(all.map((item) => item.author))].sort()
  const noun = kind === "pull" ? "pull requests" : "issues"
  const empty = kind === "pull" ? `There aren’t any ${status} pull requests.` : `There aren’t any ${status} issues.`

  function setStatus(next: "open" | "closed") {
    setQuery((current) => setToken(current, "is:", next))
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={`Search ${noun}`}
            className="h-8 bg-muted/40 pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-semibold hover:bg-muted">
            <Tag className="size-3.5" />
            Labels
            <span className="rounded-full bg-muted px-1.5 text-[11px]">{labels.length}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>Filter by label</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQuery((current) => setToken(current, "label:", null))}>
              Any label
            </DropdownMenuItem>
            {labels.map((label) => (
              <DropdownMenuItem
                key={label.name}
                onClick={() => setQuery((current) => setToken(current, "label:", label.name))}
              >
                <LabelPill name={label.name} color={label.color} />
              </DropdownMenuItem>
            ))}
            {labels.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No labels yet.</div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-semibold hover:bg-muted">
            <Milestone className="size-3.5" />
            Milestones
            <span className="rounded-full bg-muted px-1.5 text-[11px]">0</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <div className="px-2 py-3 text-xs text-muted-foreground">No milestones.</div>
          </DropdownMenuContent>
        </DropdownMenu>
        {kind === "issue" ? (
          <Link
            href={`/${repo.ownerLogin}/${repo.name}/issues/new`}
            className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            New issue
          </Link>
        ) : (
          <Link
            href={`/${repo.ownerLogin}/${repo.name}/compare`}
            className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            New pull request
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2">
          <StateFilters openCount={openCount} closedCount={closedCount} state={status} onChange={setStatus} />
          <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-muted-foreground">
            <FilterMenu
              label="Author"
              value={parsed.author ?? "any"}
              onChange={(value) => setQuery((current) => setToken(current, "author:", value === "any" ? null : value))}
              items={[{ value: "any", label: "Any author" }, ...authors.map((login) => ({ value: login, label: login }))]}
            />
            <FilterMenu
              label="Label"
              value={parsed.labels[0] ?? "any"}
              onChange={(value) => setQuery((current) => setToken(current, "label:", value === "any" ? null : value))}
              items={[
                { value: "any", label: "Any label" },
                ...labels.map((label) => ({ value: label.name, label: label.name, color: label.color })),
              ]}
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
                Sort
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>Sort</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="comments">Most commented</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="border-t px-4 py-16 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="border-t">
            {items.map((item) => (
              <IssueRow
                key={item.id}
                item={item as Issue | PullRequest}
                kind={kind}
                showRepo={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterMenu({
  label,
  value,
  onChange,
  items,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string; color?: string }[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
        {label}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Filter by {label.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.value} onClick={() => onChange(item.value)}>
            <span className="flex items-center gap-2">
              {item.color ? <LabelPill name={item.label} color={item.color} /> : item.label}
              {item.value === value && !item.color ? <span className="text-muted-foreground">✓</span> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
