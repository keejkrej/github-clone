"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"

import { PullHeader, PullMissing } from "@/components/github/pr-header"
import { ReviewChangesButton, SplitDiffView } from "@/components/github/split-diff"
import { usePlatform } from "@/lib/platform/provider"
import { addIssueComment, getPull, getRepo, pullDiff } from "@/lib/platform/store"

export default function PullFilesPage() {
  const params = useParams<{ owner: string; repo: string; number: string }>()
  const snapshot = usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const number = Number(params.number)
  const repo = getRepo(owner, name)
  const pull = repo ? getPull(repo.id, number) : undefined
  const diffs = useMemo(() => (pull ? pullDiff(pull) : []), [pull, snapshot.rev])

  if (!repo) return null
  if (!pull) return <PullMissing owner={owner} name={name} number={params.number} />

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-4">
      <PullHeader repo={repo} pull={pull} tab="files" />
      <SplitDiffView
        diffs={diffs}
        reviewSlot={
          <ReviewChangesButton
            onComment={(body) => addIssueComment(pull.repoId, pull.number, body, snapshot.state.sessionLogin)}
          />
        }
      />
    </div>
  )
}
