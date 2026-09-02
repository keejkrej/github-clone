"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { UserAvatar } from "@/components/github/user-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePlatform } from "@/lib/platform/provider"
import { createRepo, getRepo } from "@/lib/platform/store"
import type { RepoVisibility } from "@/lib/platform/types"

const REPO_NAME = /^[a-zA-Z0-9._-]+$/

export default function NewRepositoryPage() {
  const router = useRouter()
  const { state } = usePlatform()
  const owner = state.sessionLogin
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<RepoVisibility>("public")
  const [autoInit, setAutoInit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const trimmed = name.trim()
  const taken = useMemo(() => (trimmed ? Boolean(getRepo(owner, trimmed)) : false), [state, owner, trimmed])
  const invalid = trimmed.length > 0 && !REPO_NAME.test(trimmed)
  const canSubmit = trimmed.length > 0 && !invalid && !taken && !pending

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError(null)
    try {
      const repo = createRepo({
        owner,
        name: trimmed,
        description,
        visibility,
        autoInit,
      })
      router.push(`/${repo.ownerLogin}/${repo.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create repository.")
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[768px] px-4 py-8">
      <h1 className="text-2xl font-normal">Create a new repository</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A repository contains all project files, including the revision history. Already have a project
        repository elsewhere?{" "}
        <span className="text-muted-foreground">Import is not available in this clone.</span>
      </p>
      <hr className="my-4" />

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="sm:w-56">
            <Label className="mb-2">Owner *</Label>
            <div className="flex h-8 items-center gap-2 rounded-md border bg-muted/30 px-2 text-sm">
              <UserAvatar login={owner} className="size-5" />
              <span className="font-medium">{owner}</span>
            </div>
          </div>
          <div className="hidden items-end pb-1 text-xl text-muted-foreground sm:flex">/</div>
          <div className="flex-1">
            <Label htmlFor="repo-name" className="mb-2">
              Repository name *
            </Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              aria-invalid={invalid || taken}
            />
          </div>
        </div>

        {trimmed && !invalid && !taken && (
          <p className="text-sm text-emerald-700">
            {owner}/{trimmed} is available.
          </p>
        )}
        {invalid && (
          <p className="text-sm text-destructive">
            Repository name may only contain ASCII letters, digits, and ._-
          </p>
        )}
        {taken && (
          <p className="text-sm text-destructive">
            The repository {owner}/{trimmed} already exists.
          </p>
        )}

        <p className="text-xs text-muted-foreground">Great repository names are short and memorable.</p>

        <div>
          <Label htmlFor="repo-desc" className="mb-2">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="repo-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="min-h-16"
          />
        </div>

        <hr />

        <fieldset className="space-y-3">
          <legend className="sr-only">Visibility</legend>
          <label className="flex cursor-pointer gap-3 rounded-md p-2 hover:bg-muted/50">
            <input
              type="radio"
              name="visibility"
              className="mt-1"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <span>
              <span className="block text-sm font-semibold">Public</span>
              <span className="text-xs text-muted-foreground">
                Anyone on the internet can see this repository. You choose who can commit.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-md p-2 hover:bg-muted/50">
            <input
              type="radio"
              name="visibility"
              className="mt-1"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            <span>
              <span className="block text-sm font-semibold">Private</span>
              <span className="text-xs text-muted-foreground">
                You choose who can see and commit to this repository.
              </span>
            </span>
          </label>
        </fieldset>

        <hr />

        <div>
          <p className="text-sm font-semibold">Initialize this repository with:</p>
          <label className="mt-3 flex cursor-pointer gap-3 rounded-md p-2 hover:bg-muted/50">
            <Checkbox checked={autoInit} onCheckedChange={(checked) => setAutoInit(checked === true)} />
            <span>
              <span className="block text-sm font-semibold">Add a README file</span>
              <span className="text-xs text-muted-foreground">
                This is where you can write a long description for your project. Git will store it as the first
                commit on <span className="font-mono">main</span> through a packfile and reference transaction.
              </span>
            </span>
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link href="/" className="text-sm text-[#0969da] hover:underline">
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create repository"}
          </Button>
        </div>
      </form>
    </div>
  )
}
