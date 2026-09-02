"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { Markdown } from "@/components/github/markdown"
import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePlatform } from "@/lib/platform/provider"
import { createIssue, getRepo, listLabels } from "@/lib/platform/store"
import { cn } from "@/lib/utils"

export default function NewIssuePage() {
  const router = useRouter()
  const params = useParams<{ owner: string; repo: string }>()
  const { state } = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [labels, setLabels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const available = repo ? listLabels(repo.id) : []
  const canSubmit = title.trim().length > 0 && !pending
  const login = state.sessionLogin

  const preview = useMemo(() => body, [body])

  if (!repo) return null

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!repo || !canSubmit) return
    setPending(true)
    setError(null)
    try {
      const issue = createIssue({
        repoId: repo.id,
        title: title.trim(),
        body,
        labels,
      })
      router.push(`/${owner}/${name}/issues/${issue.number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create issue.")
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1012px] px-4 py-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-6 lg:flex-row">
        <UserAvatar login={login} className="hidden size-10 lg:block" />
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            required
            className="h-9 text-base"
          />
          <div className="mt-3 overflow-hidden rounded-md border">
            <div className="flex gap-1 border-b bg-muted/40 px-2 pt-2">
              <button
                type="button"
                onClick={() => setTab("write")}
                className={cn(
                  "-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-sm",
                  tab === "write" ? "border-border border-b-background bg-background font-semibold" : "text-muted-foreground",
                )}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={cn(
                  "-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-sm",
                  tab === "preview" ? "border-border border-b-background bg-background font-semibold" : "text-muted-foreground",
                )}
              >
                Preview
              </button>
            </div>
            <div className="p-2">
              {tab === "write" ? (
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Leave a comment"
                  rows={10}
                  className="min-h-48"
                />
              ) : (
                <div className="min-h-48 px-2 py-2">
                  {preview.trim() ? <Markdown source={preview} /> : <p className="text-sm text-muted-foreground">Nothing to preview</p>}
                </div>
              )}
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-3">
            <Link href={`/${owner}/${name}/issues`} className="text-sm text-[#0969da] hover:underline">
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit new issue"}
            </Button>
          </div>
        </div>
        <aside className="w-full shrink-0 space-y-4 text-sm lg:w-[240px]">
          <section className="border-b pb-4">
            <div className="text-xs font-semibold text-muted-foreground">Labels</div>
            {available.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">None yet</p>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                {available.map((label) => {
                  const checked = labels.includes(label.name)
                  return (
                    <label key={label.name} className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setLabels((current) =>
                            checked ? current.filter((name) => name !== label.name) : [...current, label.name],
                          )
                        }
                      />
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: `#${label.color}` }}
                      />
                      {label.name}
                    </label>
                  )
                })}
              </div>
            )}
          </section>
          <section className="border-b pb-4">
            <div className="text-xs font-semibold text-muted-foreground">Assignees</div>
            <p className="mt-2 text-xs text-muted-foreground">No one assigned</p>
          </section>
          <section>
            <div className="text-xs font-semibold text-muted-foreground">Milestone</div>
            <p className="mt-2 text-xs text-muted-foreground">No milestone</p>
          </section>
        </aside>
      </form>
    </div>
  )
}
