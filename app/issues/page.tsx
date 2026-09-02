"use client"

import { useMemo, useState } from "react"

import { IssueRow, StateFilters } from "@/components/github/issue-row"
import { usePlatform } from "@/lib/platform/provider"
import { listUserIssues } from "@/lib/platform/store"

export default function IssuesPage() {
  const { state } = usePlatform()
  const [status, setStatus] = useState<"open" | "closed">("open")
  const [scope, setScope] = useState<"all" | "created" | "assigned">("all")
  const login = state.sessionLogin

  const items = useMemo(() => {
    const all = listUserIssues(login)
    return all.filter((issue) => {
      if (issue.state !== status) return false
      if (scope === "created") return issue.author === login
      if (scope === "assigned") return issue.assignees.includes(login)
      return true
    })
  }, [state, login, status, scope])

  const all = listUserIssues(login)
  const scoped =
    scope === "created"
      ? all.filter((issue) => issue.author === login)
      : scope === "assigned"
        ? all.filter((issue) => issue.assignees.includes(login))
        : all
  const openCount = scoped.filter((issue) => issue.state === "open").length
  const closedCount = scoped.filter((issue) => issue.state === "closed").length

  return (
    <div className="mx-auto w-full max-w-[1012px] px-4 py-6">
      <h1 className="text-xl font-semibold">Issues</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Issues created by or assigned to {login}.
      </p>

      <div className="mt-4 flex overflow-hidden rounded-md border text-sm">
        {(["all", "created", "assigned"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={`px-3 py-1.5 capitalize ${value !== "all" ? "border-l" : ""} ${
              scope === value ? "bg-muted font-semibold" : "hover:bg-muted/50"
            }`}
          >
            {value === "all" ? "Created & assigned" : value}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-md border">
        <StateFilters
          openCount={openCount}
          closedCount={closedCount}
          state={status}
          onChange={setStatus}
        />
        {items.length === 0 ? (
          <p className="border-t px-4 py-12 text-center text-sm text-muted-foreground">
            There aren’t any {status} issues.
          </p>
        ) : (
          <div className="border-t">
            {items.map((issue) => (
              <IssueRow key={issue.id} item={issue} kind="issue" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
