"use client"

import { ChevronDown } from "lucide-react"

import { LabelPill } from "@/components/github/label-pill"
import { UserAvatar } from "@/components/github/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePlatform } from "@/lib/platform/provider"
import {
  listLabels,
  listUsers,
  toggleIssueAssignee,
  toggleIssueLabel,
} from "@/lib/platform/store"
import type { Issue, PullRequest } from "@/lib/platform/types"

export function IssueSidebar({
  item,
}: {
  item: Issue | PullRequest
}) {
  const { state } = usePlatform()
  const labels = listLabels(item.repoId)
  const users = listUsers()
  const session = state.sessionLogin

  return (
    <aside className="w-full shrink-0 space-y-4 text-sm lg:w-[240px] xl:w-[280px]">
      <section className="border-b pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-[#0969da]">
            Assignees
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Assign up to 10 people</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {users.map((user) => (
              <DropdownMenuItem
                key={user.login}
                onClick={() => toggleIssueAssignee(item.repoId, item.number, user.login)}
              >
                <UserAvatar login={user.login} className="size-5" />
                <span className="font-semibold">{user.login}</span>
                {item.assignees.includes(user.login) ? <span className="ml-auto text-muted-foreground">✓</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {item.assignees.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No one—
            <button
              type="button"
              className="ml-1 text-[#0969da] hover:underline"
              onClick={() => toggleIssueAssignee(item.repoId, item.number, session)}
            >
              assign yourself
            </button>
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {item.assignees.map((login) => (
              <li key={login} className="flex items-center gap-2">
                <UserAvatar login={login} className="size-5" linked />
                <span className="font-semibold">{login}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-b pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-[#0969da]">
            Labels
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Apply labels</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {labels.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No labels in this repository.</div>
            ) : (
              labels.map((label) => (
                <DropdownMenuItem
                  key={label.name}
                  onClick={() => toggleIssueLabel(item.repoId, item.number, label.name)}
                >
                  <LabelPill name={label.name} color={label.color} />
                  {item.labels.includes(label.name) ? <span className="ml-auto text-muted-foreground">✓</span> : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {item.labels.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">None yet</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.labels.map((name) => {
              const label = labels.find((entry) => entry.name === name)
              return <LabelPill key={name} name={name} color={label?.color} />
            })}
          </div>
        )}
      </section>

      <section className="border-b pb-4">
        <div className="text-xs font-semibold text-muted-foreground">Milestone</div>
        <p className="mt-2 text-xs text-muted-foreground">No milestone</p>
      </section>
    </aside>
  )
}
