"use client"

import { useParams } from "next/navigation"

import { CommentComposer, Timeline } from "@/components/github/comment-thread"
import { IssueSidebar } from "@/components/github/issue-sidebar"
import { MergeBox } from "@/components/github/merge-box"
import { PullHeader, PullMissing } from "@/components/github/pr-header"
import { usePlatform } from "@/lib/platform/provider"
import { getPull, getRepo } from "@/lib/platform/store"

export default function PullConversationPage() {
  const params = useParams<{ owner: string; repo: string; number: string }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const number = Number(params.number)
  const repo = getRepo(owner, name)
  const pull = repo ? getPull(repo.id, number) : undefined
  if (!repo) return null
  if (!pull) return <PullMissing owner={owner} name={name} number={params.number} />

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <PullHeader repo={repo} pull={pull} tab="conversation" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <Timeline item={pull} kind="pull" />
          <MergeBox repo={repo} pull={pull} />
          <CommentComposer
            repoId={pull.repoId}
            number={pull.number}
            author={pull.author}
            kind="pull"
            state={pull.state}
            merged={pull.merged}
          />
        </div>
        <IssueSidebar item={pull} />
      </div>
    </div>
  )
}
