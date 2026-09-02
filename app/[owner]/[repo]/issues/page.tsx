"use client"

import { useParams } from "next/navigation"

import { IssueList } from "@/components/github/issue-list"
import { usePlatform } from "@/lib/platform/provider"
import { getRepo } from "@/lib/platform/store"

export default function RepoIssuesPage() {
  const params = useParams<{ owner: string; repo: string }>()
  usePlatform()
  const owner = decodeURIComponent(params.owner ?? "")
  const name = decodeURIComponent(params.repo ?? "")
  const repo = getRepo(owner, name)
  if (!repo) return null
  return <IssueList repo={repo} kind="issue" />
}
