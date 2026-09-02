import {
  CasError,
  GitStore,
  gitStore,
  replaceGitStore,
  type FileDiff,
  type Ident,
  type LogEntry,
  type LsTreeEntry,
} from "@/lib/git"
import { seedPlatform } from "./seed"
import { toDateKey, unixFromIso } from "./time"
import type {
  ActivityEvent,
  Actor,
  Comment,
  CreateRepoInput,
  Issue,
  Notification,
  Org,
  PlatformState,
  PullRequest,
  Repository,
  SearchResults,
  User,
} from "./types"

const STORAGE_KEY = "github-clone:v1"
const STORAGE_VERSION = 2
export const SESSION_LOGIN = "octocat"
const REPO_NAME = /^[a-zA-Z0-9._-]+$/

type Snapshot = { rev: number; state: PlatformState }

type Persisted = {
  version: number
  platform: PlatformState
  git: ReturnType<GitStore["serialize"]>
}

let seq = 1
let listeners = new Set<() => void>()
let hydrated = false

function nextId(prefix: string): string {
  seq += 1
  return `${prefix}_${seq}`
}

function emptyState(): PlatformState {
  return {
    users: [],
    orgs: [],
    repos: [],
    stars: [],
    watches: [],
    labels: [],
    issues: [],
    pullRequests: [],
    notifications: [],
    activity: [],
    issueCounters: {},
    sessionLogin: SESSION_LOGIN,
  }
}

let state: PlatformState = emptyState()
let snapshot: Snapshot = { rev: 0, state }

function emit() {
  snapshot = { rev: snapshot.rev + 1, state }
  persist()
  listeners.forEach((listener) => listener())
}

function persist() {
  if (!hydrated || typeof window === "undefined") return
  const payload: Persisted = {
    version: STORAGE_VERSION,
    platform: state,
    git: gitStore().serialize(),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function nowIso(): string {
  return new Date().toISOString()
}

function identFor(login: string, at: string): Ident {
  const user = state.users.find((item) => item.login === login)
  return {
    name: user?.name ?? login,
    email: `${login}@users.noreply.github.local`,
    timestamp: unixFromIso(at),
    tz: "+0000",
  }
}

function repoById(repoId: string): Repository {
  const repo = state.repos.find((item) => item.id === repoId)
  if (!repo) throw new Error(`unknown repository ${repoId}`)
  return repo
}

function nextNumber(repoId: string): number {
  const n = (state.issueCounters[repoId] ?? 0) + 1
  state.issueCounters[repoId] = n
  return n
}

function languageOf(path: string): string | null {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "TypeScript"
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "JavaScript"
  if (path.endsWith(".py")) return "Python"
  if (path.endsWith(".go")) return "Go"
  if (path.endsWith(".css")) return "CSS"
  if (path.endsWith(".rs")) return "Rust"
  return null
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): Snapshot {
  return snapshot
}

export function getServerSnapshot(): Snapshot {
  return snapshot
}

export function getState(): PlatformState {
  return state
}

export function hydrateFromStorage(): void {
  if (typeof window === "undefined") return
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Persisted
      if (parsed.version === STORAGE_VERSION && parsed.platform && parsed.git) {
        replaceGitStore(GitStore.deserialize(parsed.git))
        state = parsed.platform
        seq = Math.max(seq, 1000)
      }
    } catch {
      // keep seeded state
    }
  }
  hydrated = true
  emit()
  ensureSpokesPull()
}

export function getSessionLogin(): string {
  return state.sessionLogin
}

export function getSessionUser(): User {
  const user = getUser(state.sessionLogin)
  if (!user) throw new Error("session user missing")
  return user
}

export function getUser(login: string): User | undefined {
  return state.users.find((item) => item.login === login)
}

export function getOrg(login: string): Org | undefined {
  return state.orgs.find((item) => item.login === login)
}

export function getActor(login: string): Actor | undefined {
  return getUser(login) ?? getOrg(login)
}

export function listUsers(): User[] {
  return state.users
}

export function listOrgs(): Org[] {
  return state.orgs
}

export function listRepos(owner?: string): Repository[] {
  const repos = owner
    ? state.repos.filter((repo) => repo.ownerLogin === owner)
    : state.repos
  return [...repos].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
}

export function getRepo(owner: string, name: string): Repository | undefined {
  return state.repos.find((repo) => repo.ownerLogin === owner && repo.name === name)
}

export function getRepoById(repoId: string): Repository | undefined {
  return state.repos.find((repo) => repo.id === repoId)
}

export function starCount(repoId: string): number {
  return state.stars.filter((star) => star.repoId === repoId).length
}

export function isStarred(login: string, repoId: string): boolean {
  return state.stars.some((star) => star.user === login && star.repoId === repoId)
}

export function watchCount(repoId: string): number {
  return state.watches.filter((watch) => watch.repoId === repoId).length
}

export function isWatching(login: string, repoId: string): boolean {
  return state.watches.some((watch) => watch.user === login && watch.repoId === repoId)
}

export function forkCount(repoId: string): number {
  return state.repos.filter((repo) => repo.parent === repoId).length
}

export function toggleStar(repoId: string, login = state.sessionLogin): boolean {
  repoById(repoId)
  const existing = state.stars.findIndex((star) => star.user === login && star.repoId === repoId)
  if (existing >= 0) {
    state.stars = state.stars.filter((_, index) => index !== existing)
  } else {
    state.stars = [...state.stars, { user: login, repoId }]
    state.activity = [
      {
        id: nextId("act"),
        actor: login,
        verb: "starred",
        repoId,
        at: nowIso(),
      },
      ...state.activity,
    ]
  }
  emit()
  return existing < 0
}

export function toggleWatch(repoId: string, login = state.sessionLogin): boolean {
  repoById(repoId)
  const existing = state.watches.findIndex((watch) => watch.user === login && watch.repoId === repoId)
  if (existing >= 0) {
    state.watches = state.watches.filter((_, index) => index !== existing)
  } else {
    state.watches = [...state.watches, { user: login, repoId }]
  }
  emit()
  return existing < 0
}

export function createRepo(input: CreateRepoInput): Repository {
  const owner = input.owner || state.sessionLogin
  const name = input.name.trim()
  if (!REPO_NAME.test(name)) {
    throw new Error("Repository name may only contain ASCII letters, digits, and ._-")
  }
  if (getRepo(owner, name)) {
    throw new Error(`Repository ${owner}/${name} already exists.`)
  }
  const actor = getActor(owner)
  if (!actor) throw new Error(`unknown owner ${owner}`)
  const id = `${owner}/${name}`
  const createdAt = nowIso()
  gitStore().createRepository({
    owner,
    name,
    visibility: input.visibility ?? "public",
    description: input.description,
  })
  if (input.autoInit) {
    gitStore().commitFiles(id, {
      files: {
        "README.md": `# ${name}\n\n${input.description ?? ""}\n`,
      },
      message: "Initial commit",
      author: identFor(state.sessionLogin, createdAt),
    })
  }
  const repo: Repository = {
    id,
    ownerLogin: owner,
    name,
    description: input.description ?? "",
    visibility: input.visibility ?? "public",
    defaultBranch: "main",
    parent: null,
    topics: [],
    license: null,
    website: "",
    createdAt,
    pushedAt: createdAt,
  }
  state.repos = [repo, ...state.repos]
  state.issueCounters[id] = 0
  state.activity = [
    {
      id: nextId("act"),
      actor: state.sessionLogin,
      verb: "opened",
      repoId: id,
      at: createdAt,
      message: "created repository",
    },
    ...state.activity,
  ]
  emit()
  return repo
}

export function forkRepo(repoId: string, newName?: string, login = state.sessionLogin): Repository {
  const source = repoById(repoId)
  const name = newName ?? source.name
  if (source.ownerLogin === login && name === source.name) {
    throw new Error("Could not fork: name already exists on this account.")
  }
  if (getRepo(login, name)) {
    throw new Error("Could not fork: name already exists on this account.")
  }
  const id = gitStore().fork(repoId, { newOwner: login, newName: name })
  const createdAt = nowIso()
  const repo: Repository = {
    id,
    ownerLogin: login,
    name,
    description: source.description,
    visibility: source.visibility,
    defaultBranch: source.defaultBranch,
    parent: source.id,
    topics: [...source.topics],
    license: source.license,
    website: source.website,
    createdAt,
    pushedAt: createdAt,
  }
  state.repos = [repo, ...state.repos]
  state.issueCounters[id] = 0
  state.activity = [
    {
      id: nextId("act"),
      actor: login,
      verb: "forked",
      repoId: source.id,
      at: createdAt,
      message: `forked to ${id}`,
    },
    ...state.activity,
  ]
  emit()
  return repo
}

export function listLabels(repoId: string) {
  return state.labels.filter((label) => label.repoId === repoId)
}

export function listIssues(repoId: string, opts: { state?: Issue["state"] | "all" } = {}): Issue[] {
  return state.issues
    .filter((issue) => issue.repoId === repoId)
    .filter((issue) => !opts.state || opts.state === "all" || issue.state === opts.state)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getIssue(repoId: string, number: number): Issue | undefined {
  return state.issues.find((issue) => issue.repoId === repoId && issue.number === number)
}

export function createIssue(input: {
  repoId: string
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
  author?: string
}): Issue {
  repoById(input.repoId)
  const author = input.author ?? state.sessionLogin
  const createdAt = nowIso()
  const issue: Issue = {
    id: nextId("issue"),
    repoId: input.repoId,
    number: nextNumber(input.repoId),
    title: input.title,
    body: input.body ?? "",
    state: "open",
    author,
    assignees: input.assignees ?? [],
    labels: input.labels ?? [],
    comments: [],
    createdAt,
    closedAt: null,
  }
  state.issues = [issue, ...state.issues]
  state.activity = [
    {
      id: nextId("act"),
      actor: author,
      verb: "opened",
      repoId: input.repoId,
      at: createdAt,
      number: issue.number,
      message: issue.title,
    },
    ...state.activity,
  ]
  notifyOwners(input.repoId, {
    type: "issue",
    repoId: input.repoId,
    number: issue.number,
    title: issue.title,
  }, "opened", author)
  emit()
  return issue
}

function threadByNumber(repoId: string, number: number): Issue | PullRequest | undefined {
  return getIssue(repoId, number) ?? getPull(repoId, number)
}

export function canModerate(repoId: string, author: string, login = state.sessionLogin): boolean {
  if (login === author) return true
  const repo = getRepoById(repoId)
  if (!repo) return false
  if (repo.ownerLogin === login) return true
  const org = getOrg(repo.ownerLogin)
  return Boolean(org?.members.includes(login))
}

export function setIssueState(repoId: string, number: number, next: Issue["state"]): Issue | PullRequest {
  const target = threadByNumber(repoId, number)
  if (!target) throw new Error("issue not found")
  const pull = getPull(repoId, number)
  if (pull?.merged && next === "open") {
    throw new Error("cannot reopen a merged pull request")
  }
  target.state = next
  target.closedAt = next === "closed" ? nowIso() : null
  emit()
  return target
}

export function toggleIssueLabel(repoId: string, number: number, name: string): void {
  const target = threadByNumber(repoId, number)
  if (!target) throw new Error("not found")
  target.labels = target.labels.includes(name)
    ? target.labels.filter((label) => label !== name)
    : [...target.labels, name]
  emit()
}

export function toggleIssueAssignee(repoId: string, number: number, login: string): void {
  const target = threadByNumber(repoId, number)
  if (!target) throw new Error("not found")
  target.assignees = target.assignees.includes(login)
    ? target.assignees.filter((item) => item !== login)
    : [...target.assignees, login]
  emit()
}

export function addIssueComment(repoId: string, number: number, body: string, author = state.sessionLogin): Comment {
  const issue = getIssue(repoId, number)
  const pull = getPull(repoId, number)
  const target = issue ?? pull
  if (!target) throw new Error("not found")
  const comment: Comment = {
    id: nextId("cmt"),
    author,
    body,
    createdAt: nowIso(),
  }
  target.comments = [...target.comments, comment]
  state.activity = [
    {
      id: nextId("act"),
      actor: author,
      verb: "commented",
      repoId,
      at: comment.createdAt,
      number,
      message: body.slice(0, 80),
    },
    ...state.activity,
  ]
  notifyOwners(repoId, {
    type: issue ? "issue" : "pull",
    repoId,
    number,
    title: target.title,
  }, "comment", author)
  emit()
  return comment
}

export function listPulls(repoId: string, opts: { state?: Issue["state"] | "all" | "merged" } = {}): PullRequest[] {
  return state.pullRequests
    .filter((pull) => pull.repoId === repoId)
    .filter((pull) => {
      if (!opts.state || opts.state === "all") return true
      if (opts.state === "merged") return pull.merged
      if (opts.state === "closed") return pull.state === "closed"
      return pull.state === "open" && !pull.merged
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getPull(repoId: string, number: number): PullRequest | undefined {
  return state.pullRequests.find((pull) => pull.repoId === repoId && pull.number === number)
}

export function findOpenPull(
  repoId: string,
  baseRef: string,
  headRef: string,
  headOwner?: string,
): PullRequest | undefined {
  return state.pullRequests.find(
    (pull) =>
      pull.repoId === repoId &&
      pull.state === "open" &&
      !pull.merged &&
      pull.base.ref === baseRef &&
      pull.head.ref === headRef &&
      (!headOwner || pull.head.owner === headOwner),
  )
}

export function createPull(input: {
  repoId: string
  title: string
  body?: string
  head: { owner: string; repo: string; ref: string }
  base: { ref: string }
  author?: string
}): PullRequest {
  const repo = repoById(input.repoId)
  const author = input.author ?? state.sessionLogin
  const headRepoId = `${input.head.owner}/${input.head.repo}`
  const headSha = gitStore().resolveRef(headRepoId, input.head.ref)
  const baseSha = gitStore().resolveRef(input.repoId, input.base.ref)
  if (!headSha) throw new Error(`head ref ${input.head.ref} not found`)
  if (!baseSha) throw new Error(`base ref ${input.base.ref} not found`)
  const createdAt = nowIso()
  const pull: PullRequest = {
    id: nextId("pr"),
    repoId: input.repoId,
    number: nextNumber(input.repoId),
    title: input.title,
    body: input.body ?? "",
    state: "open",
    author,
    assignees: [],
    labels: [],
    comments: [],
    createdAt,
    closedAt: null,
    head: { ...input.head, sha: headSha },
    base: { ref: input.base.ref, sha: baseSha },
    merged: false,
    mergedAt: null,
    mergedBy: null,
    mergeCommitSha: null,
  }
  state.pullRequests = [pull, ...state.pullRequests]
  state.activity = [
    {
      id: nextId("act"),
      actor: author,
      verb: "opened",
      repoId: repo.id,
      at: createdAt,
      number: pull.number,
      message: pull.title,
    },
    ...state.activity,
  ]
  notifyOwners(repo.id, {
    type: "pull",
    repoId: repo.id,
    number: pull.number,
    title: pull.title,
  }, "review requested", author)
  emit()
  return pull
}

export function pullHeadSha(pull: PullRequest): string | null {
  return gitStore().resolveRef(`${pull.head.owner}/${pull.head.repo}`, pull.head.ref)
}

export function pullBaseSha(pull: PullRequest): string | null {
  return gitStore().resolveRef(pull.repoId, pull.base.ref)
}

export function pullDiff(pull: PullRequest): FileDiff[] {
  const base = pullBaseSha(pull)
  const head = pullHeadSha(pull)
  try {
    return gitStore().diffTrees(pull.repoId, base, head)
  } catch {
    return gitStore().diffTrees(`${pull.head.owner}/${pull.head.repo}`, base, head)
  }
}

export function pullCommits(pull: PullRequest): LogEntry[] {
  const headRepo = `${pull.head.owner}/${pull.head.repo}`
  const head = pullHeadSha(pull)
  const base = pullBaseSha(pull)
  if (!head) return []
  const git = gitStore()
  const commits = git.log(headRepo, head)
  if (!base) return commits
  return commits.filter((commit) => {
    if (commit.sha === base) return false
    try {
      return !git.isAncestor(pull.repoId, commit.sha, base)
    } catch {
      return true
    }
  })
}

export type PullMergeStatus = {
  mergeable: boolean
  fastForward: boolean
  alreadyContained: boolean
  conflicts: string[]
}

export function pullMergeStatus(pull: PullRequest): PullMergeStatus {
  if (pull.merged) {
    return { mergeable: false, fastForward: false, alreadyContained: true, conflicts: [] }
  }
  const git = gitStore()
  const head = pullHeadSha(pull)
  const base = pullBaseSha(pull)
  if (!head || !base) {
    return { mergeable: false, fastForward: false, alreadyContained: false, conflicts: [] }
  }
  try {
    if (git.isAncestor(pull.repoId, base, head)) {
      return { mergeable: true, fastForward: true, alreadyContained: false, conflicts: [] }
    }
    if (git.isAncestor(pull.repoId, head, base)) {
      return { mergeable: false, fastForward: true, alreadyContained: true, conflicts: [] }
    }
  } catch {
    // fall through to a 3-way file check
  }
  let ancestorFiles: Record<string, string> = {}
  let ours: Record<string, string> = {}
  let theirs: Record<string, string> = {}
  try {
    ancestorFiles = git.readFiles(pull.repoId, pull.base.sha)
    ours = git.readFiles(pull.repoId, base)
    theirs = git.readFiles(`${pull.head.owner}/${pull.head.repo}`, head)
  } catch {
    return { mergeable: false, fastForward: false, alreadyContained: false, conflicts: [] }
  }
  const paths = new Set([...Object.keys(ancestorFiles), ...Object.keys(ours), ...Object.keys(theirs)])
  const conflicts: string[] = []
  for (const path of paths) {
    const ancestor = ancestorFiles[path]
    const our = ours[path]
    const their = theirs[path]
    if (our === their) continue
    if (our === ancestor) continue
    if (their === ancestor) continue
    conflicts.push(path)
  }
  return {
    mergeable: conflicts.length === 0,
    fastForward: false,
    alreadyContained: false,
    conflicts,
  }
}

export function mergePull(repoId: string, number: number, login = state.sessionLogin): PullRequest {
  const pull = getPull(repoId, number)
  if (!pull) throw new Error("pull request not found")
  if (pull.merged) throw new Error("already merged")
  const headSha = pullHeadSha(pull)
  if (!headSha) throw new Error("head ref missing")
  const author = identFor(login, nowIso())
  const result = gitStore().merge(repoId, {
    oursRef: `refs/heads/${pull.base.ref}`,
    theirsSha: headSha,
    author,
    message: `Merge pull request #${pull.number} from ${pull.head.owner}/${pull.head.ref}`,
  })
  if (!result.mergeable) {
    throw new Error(`pull request is not mergeable: ${(result.conflicts ?? []).join(", ")}`)
  }
  const at = nowIso()
  pull.merged = true
  pull.state = "closed"
  pull.mergedAt = at
  pull.mergedBy = login
  pull.mergeCommitSha = result.sha
  pull.closedAt = at
  repoById(repoId).pushedAt = at
  state.activity = [
    {
      id: nextId("act"),
      actor: login,
      verb: "merged",
      repoId,
      at,
      number: pull.number,
      message: pull.title,
    },
    ...state.activity,
  ]
  notifyOwners(
    repoId,
    {
      type: "pull",
      repoId,
      number: pull.number,
      title: pull.title,
    },
    "merged",
    login,
  )
  emit()
  return pull
}

export function listNotifications(login = state.sessionLogin): Notification[] {
  return state.notifications
    .filter((item) => item.user === login)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadNotificationCount(login = state.sessionLogin): number {
  return state.notifications.filter((item) => item.user === login && item.unread).length
}

export function markNotificationRead(id: string): void {
  const item = state.notifications.find((notification) => notification.id === id)
  if (item) item.unread = false
  emit()
}

export function markAllNotificationsRead(login = state.sessionLogin): void {
  for (const item of state.notifications) {
    if (item.user === login) item.unread = false
  }
  emit()
}

export function listActivity(login?: string): ActivityEvent[] {
  const events = login
    ? state.activity.filter((event) => event.actor === login)
    : state.activity
  return [...events].sort((a, b) => b.at.localeCompare(a.at))
}

export function search(query: string): SearchResults {
  const q = query.trim().toLowerCase()
  if (!q) {
    return { repos: [], issues: [], pullRequests: [], users: [] }
  }
  return {
    repos: state.repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(q) ||
        repo.description.toLowerCase().includes(q) ||
        repo.id.toLowerCase().includes(q),
    ),
    issues: state.issues.filter((issue) => issue.title.toLowerCase().includes(q)),
    pullRequests: state.pullRequests.filter((pull) => pull.title.toLowerCase().includes(q)),
    users: state.users.filter(
      (user) =>
        user.login.toLowerCase().includes(q) || user.name.toLowerCase().includes(q),
    ),
  }
}

export function followUser(target: string, login = state.sessionLogin): void {
  const user = getUser(login)
  const other = getUser(target)
  if (!user || !other || login === target) return
  if (!user.following.includes(target)) user.following = [...user.following, target]
  if (!other.followers.includes(login)) other.followers = [...other.followers, login]
  emit()
}

export function unfollowUser(target: string, login = state.sessionLogin): void {
  const user = getUser(login)
  const other = getUser(target)
  if (!user || !other) return
  user.following = user.following.filter((item) => item !== target)
  other.followers = other.followers.filter((item) => item !== login)
  emit()
}

export function isFollowing(target: string, login = state.sessionLogin): boolean {
  return Boolean(getUser(login)?.following.includes(target))
}

export function toggleFollow(target: string, login = state.sessionLogin): boolean {
  if (login === target || !getUser(target)) return isFollowing(target, login)
  const following = isFollowing(target, login)
  if (following) unfollowUser(target, login)
  else followUser(target, login)
  return !following
}

export function starredRepos(login: string): Repository[] {
  const ids = state.stars.filter((star) => star.user === login).map((star) => star.repoId)
  const repos: Repository[] = []
  for (const id of [...ids].reverse()) {
    const repo = getRepoById(id)
    if (repo) repos.push(repo)
  }
  return repos
}

export function pinnedRepos(owner: string, limit = 6): Repository[] {
  return [...listRepos(owner)]
    .sort((a, b) => {
      const stars = starCount(b.id) - starCount(a.id)
      if (stars !== 0) return stars
      return b.pushedAt.localeCompare(a.pushedAt)
    })
    .slice(0, limit)
}

export function listUserIssues(login = state.sessionLogin): Issue[] {
  return state.issues
    .filter((issue) => issue.author === login || issue.assignees.includes(login))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listUserPulls(login = state.sessionLogin): PullRequest[] {
  return state.pullRequests
    .filter((pull) => pull.author === login || pull.assignees.includes(login))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function trendingRepos(limit = 6): Repository[] {
  return [...state.repos]
    .filter((repo) => repo.visibility === "public")
    .sort((a, b) => starCount(b.id) - starCount(a.id) || b.pushedAt.localeCompare(a.pushedAt))
    .slice(0, limit)
}

export function primaryLanguage(repoId: string) {
  return repoLanguages(repoId)[0] ?? null
}

export function gitLog(repoId: string, ref: string, max?: number): LogEntry[] {
  return gitStore().log(repoId, ref, { max })
}

export function gitLsTree(repoId: string, ref: string, path = ""): LsTreeEntry[] {
  return gitStore().lsTree(repoId, ref, path)
}

export function gitCatFile(repoId: string, sha: string) {
  return gitStore().catFile(repoId, sha)
}

export function gitReadFiles(repoId: string, ref: string): Record<string, string> {
  return gitStore().readFiles(repoId, ref)
}

export function gitResolveRef(repoId: string, ref: string): string | null {
  return gitStore().resolveRef(repoId, ref)
}

export function gitListRefs(repoId: string): Record<string, string> {
  return gitStore().listRefs(repoId)
}

export function listBranches(repoId: string): string[] {
  const refs = gitStore().listRefs(repoId)
  return Object.keys(refs)
    .filter((name) => name.startsWith("refs/heads/"))
    .map((name) => name.slice("refs/heads/".length))
    .sort()
}

export function listTags(repoId: string): string[] {
  const refs = gitStore().listRefs(repoId)
  return Object.keys(refs)
    .filter((name) => name.startsWith("refs/tags/"))
    .map((name) => name.slice("refs/tags/".length))
    .sort()
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function commitSubject(message: string): string {
  return (message.split("\n")[0] ?? "").trim()
}

export function commitBody(message: string): string {
  const newline = message.indexOf("\n")
  return newline === -1 ? "" : message.slice(newline + 1).trim()
}

export function loginFromIdent(ident: Ident): string {
  const at = ident.email.indexOf("@")
  if (at > 0) {
    const candidate = ident.email.slice(0, at)
    if (getUser(candidate) || getOrg(candidate)) return candidate
  }
  const byName = state.users.find((user) => user.name === ident.name)
  if (byName) return byName.login
  return ident.name
}

export function repoContributors(repoId: string, ref?: string): { login: string; commits: number }[] {
  const repo = getRepoById(repoId)
  if (!repo) return []
  const commits = gitStore().log(repoId, ref ?? repo.defaultBranch)
  const counts = new Map<string, number>()
  for (const commit of commits) {
    const login = loginFromIdent(commit.author)
    counts.set(login, (counts.get(login) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([login, n]) => ({ login, commits: n }))
    .sort((a, b) => b.commits - a.commits)
}

export function gitDiffTrees(repoId: string, oldSha: string | null, newSha: string | null): FileDiff[] {
  return gitStore().diffTrees(repoId, oldSha, newSha)
}

export function lastCommitsForPaths(repoId: string, ref: string, paths: string[]): Map<string, LogEntry> {
  const commits = gitStore().log(repoId, ref)
  const remaining = new Set(paths.filter(Boolean))
  const result = new Map<string, LogEntry>()
  if (commits[0] && paths.includes("")) result.set("", commits[0])
  for (const commit of commits) {
    if (remaining.size === 0) break
    const parent = commit.parents[0] ?? null
    const diffs = gitStore().diffTrees(repoId, parent, commit.sha)
    for (const path of [...remaining]) {
      const matched = diffs.some((diff) => diff.path === path || diff.path.startsWith(`${path}/`))
      if (matched) {
        result.set(path, commit)
        remaining.delete(path)
      }
    }
  }
  const fallback = commits[commits.length - 1]
  if (fallback) {
    for (const path of remaining) result.set(path, fallback)
  }
  return result
}

export function findCommit(repoId: string, prefix: string): LogEntry | null {
  const needle = prefix.toLowerCase()
  if (needle.length < 7) return null
  const direct = gitStore().resolveRef(repoId, needle)
  if (direct) {
    try {
      const object = gitStore().catFile(repoId, direct)
      if (object.type === "commit") return { sha: object.sha, ...object.commit }
    } catch {
      // keep searching
    }
  }
  const seen = new Set<string>()
  for (const branch of listBranches(repoId)) {
    for (const commit of gitStore().log(repoId, branch)) {
      if (seen.has(commit.sha)) continue
      seen.add(commit.sha)
      if (commit.sha === needle || commit.sha.startsWith(needle)) return commit
    }
  }
  return null
}

export function existingFork(repoId: string, login = state.sessionLogin): Repository | undefined {
  return state.repos.find((repo) => repo.parent === repoId && repo.ownerLogin === login)
}

export function repoLanguages(repoId: string): { name: string; bytes: number; colorClass: string }[] {
  const repo = getRepoById(repoId)
  if (!repo) return []
  const files = gitStore().readFiles(repoId, repo.defaultBranch)
  const counts = new Map<string, number>()
  for (const [path, content] of Object.entries(files)) {
    const lang = languageOf(path)
    if (!lang) continue
    counts.set(lang, (counts.get(lang) ?? 0) + content.length)
  }
  const color: Record<string, string> = {
    TypeScript: "gh-lang-ts",
    JavaScript: "gh-lang-js",
    Python: "gh-lang-python",
    Go: "gh-lang-go",
    CSS: "gh-lang-css",
    Rust: "gh-lang-rust",
  }
  return [...counts.entries()]
    .map(([name, bytes]) => ({ name, bytes, colorClass: color[name] ?? "bg-muted-foreground" }))
    .sort((a, b) => b.bytes - a.bytes)
}

export function contributionHeatmap(login: string): { date: string; count: number }[] {
  const counts = new Map<string, number>()
  const user = getUser(login)
  for (const repo of state.repos) {
    const tip = gitStore().resolveRef(repo.id, repo.defaultBranch)
    if (!tip) continue
    for (const commit of gitStore().log(repo.id, repo.defaultBranch)) {
      const email = commit.author.email
      const name = commit.author.name
      const matches =
        email.startsWith(`${login}@`) ||
        name === login ||
        name === user?.name
      if (!matches) continue
      const key = toDateKey(commit.author.timestamp)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const days: { date: string; count: number }[] = []
  const now = new Date()
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const startUtc = endUtc - (52 * 7 - 1) * 86_400_000
  for (let t = startUtc; t <= endUtc; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    days.push({ date, count: counts.get(date) ?? 0 })
  }
  return days
}

export function issueCount(repoId: string, which: Issue["state"] = "open"): number {
  return state.issues.filter((issue) => issue.repoId === repoId && issue.state === which).length
}

export function pullCount(repoId: string, which: "open" | "closed" | "merged" = "open"): number {
  return listPulls(repoId, { state: which }).length
}

function notifyOwners(
  repoId: string,
  subject: Notification["subject"],
  reason: string,
  actor: string,
) {
  const repo = repoById(repoId)
  const targets = new Set<string>([repo.ownerLogin])
  const org = getOrg(repo.ownerLogin)
  if (org) org.members.forEach((member) => targets.add(member))
  targets.delete(actor)
  const createdAt = nowIso()
  for (const user of targets) {
    if (!getUser(user)) continue
    state.notifications = [
      {
        id: nextId("n"),
        user,
        unread: true,
        reason,
        subject,
        createdAt,
      },
      ...state.notifications,
    ]
  }
}

export function applySeed(next: PlatformState): void {
  state = next
  emit()
}

function ensureSpokesPull(): void {
  const repo = getRepo("octocat", "spokes")
  if (!repo) return
  const exists = state.pullRequests.some(
    (pull) => pull.repoId === repo.id && pull.head.ref === "wal-index" && pull.base.ref === "main",
  )
  if (exists) return
  if (!gitStore().resolveRef(repo.id, "wal-index") || !gitStore().resolveRef(repo.id, "main")) return
  try {
    createPull({
      repoId: repo.id,
      title: "Linearize pushes through the WAL index",
      body: "The index pointer is the commit point. Concurrent pushers retry when CAS fails on a stale etag.",
      head: { owner: "octocat", repo: "spokes", ref: "wal-index" },
      base: { ref: "main" },
      author: "octocat",
    })
  } catch {
    // seed already covered this PR, or refs are missing
  }
}

export { CasError }

export function bootstrap(): void {
  if (gitStore().listRepositories().length > 0) return
  const seeded = seedPlatform(gitStore())
  state = seeded
  snapshot = { rev: 1, state }
}

bootstrap()
ensureSpokesPull()
