export type ActorType = "user" | "org"

export type User = {
  type: "user"
  login: string
  name: string
  avatarInitials: string
  bio: string
  company: string
  location: string
  website: string
  followers: string[]
  following: string[]
  createdAt: string
}

export type Org = {
  type: "org"
  login: string
  name: string
  avatarInitials: string
  bio: string
  company: string
  location: string
  website: string
  members: string[]
  createdAt: string
}

export type Actor = User | Org

export type RepoVisibility = "public" | "private"

export type Repository = {
  id: string
  ownerLogin: string
  name: string
  description: string
  visibility: RepoVisibility
  defaultBranch: string
  parent: string | null
  topics: string[]
  license: string | null
  website: string
  createdAt: string
  pushedAt: string
}

export type Star = { user: string; repoId: string }
export type Watch = { user: string; repoId: string }

export type Label = {
  repoId: string
  name: string
  color: string
  description: string
}

export type IssueState = "open" | "closed"

export type Comment = {
  id: string
  author: string
  body: string
  createdAt: string
}

export type Issue = {
  id: string
  repoId: string
  number: number
  title: string
  body: string
  state: IssueState
  author: string
  assignees: string[]
  labels: string[]
  comments: Comment[]
  createdAt: string
  closedAt: string | null
}

export type PullRef = {
  owner: string
  repo: string
  ref: string
  sha: string
}

export type PullRequest = {
  id: string
  repoId: string
  number: number
  title: string
  body: string
  state: IssueState
  author: string
  assignees: string[]
  labels: string[]
  comments: Comment[]
  createdAt: string
  closedAt: string | null
  head: PullRef
  base: { ref: string; sha: string }
  merged: boolean
  mergedAt: string | null
  mergedBy: string | null
  mergeCommitSha: string | null
}

export type NotificationSubject = {
  type: "issue" | "pull" | "repo"
  repoId: string
  number?: number
  title: string
}

export type Notification = {
  id: string
  user: string
  unread: boolean
  reason: string
  subject: NotificationSubject
  createdAt: string
}

export type ActivityVerb =
  | "pushed"
  | "opened"
  | "starred"
  | "forked"
  | "merged"
  | "commented"

export type ActivityEvent = {
  id: string
  actor: string
  verb: ActivityVerb
  repoId: string
  at: string
  number?: number
  message?: string
}

export type PlatformState = {
  users: User[]
  orgs: Org[]
  repos: Repository[]
  stars: Star[]
  watches: Watch[]
  labels: Label[]
  issues: Issue[]
  pullRequests: PullRequest[]
  notifications: Notification[]
  activity: ActivityEvent[]
  issueCounters: Record<string, number>
  sessionLogin: string
}

export type CreateRepoInput = {
  owner: string
  name: string
  description?: string
  visibility?: RepoVisibility
  autoInit?: boolean
}

export type SearchResults = {
  repos: Repository[]
  issues: Issue[]
  pullRequests: PullRequest[]
  users: User[]
}
