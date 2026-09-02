"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, CircleAlert, GitMerge } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePlatform } from "@/lib/platform/provider"
import { mergePull, pullMergeStatus, shortSha } from "@/lib/platform/store"
import type { PullRequest, Repository } from "@/lib/platform/types"

export function MergeBox({ repo, pull }: { repo: Repository; pull: PullRequest }) {
  usePlatform()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const status = pullMergeStatus(pull)
  const base = `/${repo.ownerLogin}/${repo.name}`

  function confirmMerge() {
    setPending(true)
    setError(null)
    try {
      mergePull(repo.id, pull.number)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.")
    } finally {
      setPending(false)
    }
  }

  if (pull.merged) {
    return (
      <div className="rounded-md border border-[#8250df]/40 bg-[#8250df]/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#8250df] text-white">
            <GitMerge className="size-4" />
          </span>
          <div>
            <p className="font-semibold">Pull request successfully merged and closed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can still post comments. The base branch{" "}
              <span className="font-mono">{pull.base.ref}</span> now points at{" "}
              {pull.mergeCommitSha ? (
                <Link href={`${base}/commit/${pull.mergeCommitSha}`} className="font-mono text-[#0969da] hover:underline">
                  {shortSha(pull.mergeCommitSha)}
                </Link>
              ) : (
                "the merged tip"
              )}
              .
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (pull.state === "closed") {
    return (
      <div className="rounded-md border p-4">
        <p className="font-semibold">This pull request is closed</p>
        <p className="mt-1 text-sm text-muted-foreground">Reopen it to merge the head branch into {pull.base.ref}.</p>
      </div>
    )
  }

  if (status.alreadyContained) {
    return (
      <div className="rounded-md border p-4">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 size-5 gh-open" />
          <div>
            <p className="font-semibold">This branch is up to date with {pull.base.ref}</p>
            <p className="mt-1 text-sm text-muted-foreground">There are no unique commits to merge.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!status.mergeable) {
    return (
      <div className="rounded-md border p-4">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 gh-closed" />
          <div>
            <p className="font-semibold">This branch has conflicts that must be resolved</p>
            {status.conflicts.length > 0 ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">{status.conflicts.join(", ")}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">The Git engine could not produce a merge tree.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 size-5 gh-open" />
          <div>
            <p className="font-semibold">This branch has no conflicts with the base branch</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.fastForward
                ? `Merging can be performed automatically as a fast-forward of ${pull.base.ref}.`
                : `Merging can be performed automatically with a merge commit on ${pull.base.ref}.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setOpen(true)}
        >
          Merge pull request
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm merge</DialogTitle>
            <DialogDescription>
              This creates a packfile and a reference transaction on{" "}
              <span className="font-mono">{pull.base.ref}</span>
              {status.fastForward ? " (fast-forward)." : " with a merge commit."} Objects stay unpublished until that
              ref transaction commits.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={pending}
              onClick={confirmMerge}
            >
              {pending ? "Merging…" : "Confirm merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
