import { fromHex, isSha, normalizeSha, toHex, utf8Decode } from "./bytes"
import { fileDiff } from "./diff"
import { hashObject } from "./hash"
import {
  buildCommit,
  flattenTree,
  parseCommit,
  parseTree,
} from "./objects"
import type {
  CatFileResult,
  CreateRepositoryInput,
  FileDiff,
  Ident,
  LogEntry,
  LsTreeEntry,
  MergeInput,
  MergeResult,
  PackedObject,
  Packfile,
  PreparedTransaction,
  PushInput,
  RefUpdate,
  SerializedGit,
  SerializedRepo,
  WalEntry,
  WalIndex,
} from "./types"

export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GitError"
  }
}

export class NonFastForwardError extends GitError {
  constructor(ref: string) {
    super(`non-fast-forward update of ${ref}`)
    this.name = "NonFastForwardError"
  }
}

export class CasError extends GitError {
  constructor(message = "wal index compare-and-swap failed") {
    super(message)
    this.name = "CasError"
  }
}

type Materialized = {
  objects: Map<string, PackedObject>
  refs: Map<string, string>
}

type RepoState = {
  id: string
  packs: Packfile[]
  wal: Map<string, WalEntry>
  index: WalIndex
  defaultBranch: string
  cache: Materialized | null
  locks: Set<string>
  txns: Map<string, PreparedTransaction>
}

const HEAD = "HEAD"
const DEFAULT_REF = "refs/heads/main"

function repoIdFor(owner: string, name: string): string {
  return `${owner}/${name}`
}

function clonePacked(object: PackedObject): PackedObject {
  return { type: object.type, sha: object.sha, payload: new Uint8Array(object.payload) }
}

function clonePack(pack: Packfile): Packfile {
  return { id: pack.id, objects: pack.objects.map(clonePacked) }
}

export class GitStore {
  private repos = new Map<string, RepoState>()
  private seq = 0

  private nextId(prefix: string): string {
    this.seq += 1
    return `${prefix}_${this.seq}`
  }

  createRepository(input: CreateRepositoryInput): string {
    const id = repoIdFor(input.owner, input.name)
    if (this.repos.has(id)) {
      throw new GitError(`repository ${id} already exists`)
    }
    const repo: RepoState = {
      id,
      packs: [],
      wal: new Map(),
      index: { headEntryId: null, etag: 0 },
      defaultBranch: "main",
      cache: {
        objects: new Map(),
        refs: new Map([[HEAD, `ref: ${DEFAULT_REF}`]]),
      },
      locks: new Set(),
      txns: new Map(),
    }
    this.repos.set(id, repo)
    return id
  }

  hasRepository(id: string): boolean {
    return this.repos.has(id)
  }

  listRepositories(): string[] {
    return [...this.repos.keys()]
  }

  getWalIndex(repoId: string): WalIndex {
    const repo = this.repo(repoId)
    return { ...repo.index }
  }

  compareAndSwapIndex(repoId: string, expectedEtag: number, next: WalIndex): boolean {
    const repo = this.repo(repoId)
    if (repo.index.etag !== expectedEtag) return false
    repo.index = { headEntryId: next.headEntryId, etag: next.etag }
    repo.cache = null
    return true
  }

  storePack(repoId: string, pack: { id?: string; objects: PackedObject[] }): string {
    const repo = this.repo(repoId)
    const objects = pack.objects.map((object) => {
      const payload = object.payload
      const sha = hashObject(object.type, payload)
      if (object.sha && object.sha !== sha) {
        throw new GitError(`pack object sha mismatch: ${object.sha} != ${sha}`)
      }
      return { type: object.type, sha, payload: new Uint8Array(payload) }
    })
    const id = pack.id ?? this.nextId("pack")
    repo.packs.push({ id, objects })
    return id
  }

  prepareRefTransaction(
    repoId: string,
    updates: RefUpdate[],
    opts: { force?: boolean } = {},
  ): PreparedTransaction {
    const repo = this.repo(repoId)
    const materialized = this.materialize(repoId)
    for (const update of updates) {
      const name = canonicalRef(update.name)
      if (repo.locks.has(name)) {
        throw new GitError(`reference ${name} is locked`)
      }
      const current = normalizeSha(peelRef(materialized, name))
      const expected = normalizeSha(update.oldSha)
      if (current !== expected) {
        throw new GitError(
          `reference ${name} expected ${expected ?? "null"} but is ${current ?? "null"}`,
        )
      }
      const next = normalizeSha(update.newSha)
      if (!opts.force && current && next && !this.isAncestor(repoId, current, next)) {
        throw new NonFastForwardError(name)
      }
      if (next) this.requireObject(repo, next)
    }
    const txn: PreparedTransaction = {
      id: this.nextId("txn"),
      repoId,
      updates: updates.map((update) => ({
        name: canonicalRef(update.name),
        oldSha: normalizeSha(update.oldSha),
        newSha: normalizeSha(update.newSha),
      })),
      force: Boolean(opts.force),
    }
    for (const update of txn.updates) repo.locks.add(update.name)
    repo.txns.set(txn.id, txn)
    return txn
  }

  commitRefTransaction(txn: PreparedTransaction | string): void {
    const id = typeof txn === "string" ? txn : txn.id
    const prepared = this.findTxn(id)
    const repo = this.repo(prepared.repoId)
    for (const update of prepared.updates) repo.locks.delete(update.name)
    repo.txns.delete(prepared.id)
    repo.cache = null
  }

  abortRefTransaction(txn: PreparedTransaction | string): void {
    const id = typeof txn === "string" ? txn : txn.id
    const prepared = this.findTxn(id)
    const repo = this.repo(prepared.repoId)
    for (const update of prepared.updates) repo.locks.delete(update.name)
    repo.txns.delete(prepared.id)
  }

  push(repoId: string, input: PushInput): { etag: number; refs: Record<string, string> } {
    const repo = this.repo(repoId)
    const expectedEtag = input.expectedEtag ?? repo.index.etag
    const packId = this.storePack(repoId, input.pack)
    let txn: PreparedTransaction | null = null
    try {
      txn = this.prepareRefTransaction(repoId, input.refUpdates, { force: input.force })
      const entry: WalEntry = {
        type: "push",
        id: this.nextId("wal"),
        prevId: repo.index.headEntryId,
        packId,
        refUpdates: txn.updates,
        timestamp: Date.now(),
      }
      repo.wal.set(entry.id, entry)
      const next: WalIndex = { headEntryId: entry.id, etag: expectedEtag + 1 }
      if (!this.compareAndSwapIndex(repoId, expectedEtag, next)) {
        throw new CasError()
      }
      this.commitRefTransaction(txn)
      txn = null
      return { etag: this.repo(repoId).index.etag, refs: this.listRefs(repoId) }
    } catch (error) {
      if (txn) this.abortRefTransaction(txn)
      throw error
    }
  }

  materialize(repoId: string): Materialized {
    const repo = this.repo(repoId)
    if (repo.cache) return repo.cache
    const objects = new Map<string, PackedObject>()
    const refs = new Map<string, string>([[HEAD, `ref: ${DEFAULT_REF}`]])
    for (const entry of this.walChain(repo)) {
      if (entry.type === "push") {
        const pack = repo.packs.find((item) => item.id === entry.packId)
        if (pack) {
          for (const object of pack.objects) objects.set(object.sha, object)
        }
        for (const update of entry.refUpdates) {
          const next = normalizeSha(update.newSha)
          if (next) refs.set(update.name, next)
          else refs.delete(update.name)
        }
      } else {
        objects.clear()
        for (const packId of entry.packIds) {
          const pack = repo.packs.find((item) => item.id === packId)
          if (!pack) continue
          for (const object of pack.objects) objects.set(object.sha, object)
        }
      }
    }
    repo.cache = { objects, refs }
    return repo.cache
  }

  resolveRef(repoId: string, ref: string): string | null {
    const materialized = this.materialize(repoId)
    if (isSha(ref)) {
      const sha = ref.toLowerCase()
      return materialized.objects.has(sha) ? sha : null
    }
    const peeled = peelRef(materialized, canonicalRef(ref))
    return normalizeSha(peeled)
  }

  listRefs(repoId: string): Record<string, string> {
    const { refs } = this.materialize(repoId)
    return Object.fromEntries(refs.entries())
  }

  catFile(repoId: string, sha: string): CatFileResult {
    const object = this.lookupObject(repoId, sha)
    if (!object) throw new GitError(`object ${sha} not found`)
    if (object.type === "blob") {
      return { type: "blob", sha: object.sha, content: utf8Decode(object.payload) }
    }
    if (object.type === "tree") {
      return { type: "tree", sha: object.sha, entries: parseTree(object.payload) }
    }
    return { type: "commit", sha: object.sha, commit: parseCommit(object.payload) }
  }

  lsTree(repoId: string, ref: string, path = ""): LsTreeEntry[] {
    const sha = this.resolveRef(repoId, ref)
    if (!sha) return []
    const object = this.requireReachable(repoId, sha)
    let treeSha: string
    if (object.type === "commit") treeSha = parseCommit(object.payload).tree
    else if (object.type === "tree") treeSha = object.sha
    else throw new GitError(`cannot ls-tree a blob`)
    const parts = path.split("/").filter(Boolean)
    for (const part of parts) {
      const tree = this.requireReachable(repoId, treeSha)
      if (tree.type !== "tree") return []
      const entry = parseTree(tree.payload).find((item) => item.name === part)
      if (!entry) return []
      if (entry.mode === "040000") treeSha = entry.sha
      else {
        return [{ ...entry, type: "blob" }]
      }
    }
    const tree = this.requireReachable(repoId, treeSha)
    if (tree.type !== "tree") return []
    return parseTree(tree.payload).map((entry) => ({
      ...entry,
      type: entry.mode === "040000" ? "tree" : "blob",
    }))
  }

  log(repoId: string, ref: string, opts: { max?: number } = {}): LogEntry[] {
    const tip = this.resolveRef(repoId, ref)
    if (!tip) return []
    const visited = new Set<string>()
    const stack = [tip]
    const commits: LogEntry[] = []
    while (stack.length) {
      const sha = stack.pop()!
      if (visited.has(sha)) continue
      visited.add(sha)
      const object = this.requireReachable(repoId, sha)
      if (object.type !== "commit") continue
      const commit = parseCommit(object.payload)
      commits.push({ sha, ...commit })
      for (const parent of commit.parents) stack.push(parent)
    }
    commits.sort((a, b) => b.committer.timestamp - a.committer.timestamp)
    return opts.max != null ? commits.slice(0, opts.max) : commits
  }

  fetchReachable(repoId: string, ref: string): PackedObject[] {
    const tip = this.resolveRef(repoId, ref)
    if (!tip) return []
    const out = new Map<string, PackedObject>()
    const walk = (sha: string) => {
      if (out.has(sha)) return
      const object = this.requireReachable(repoId, sha)
      out.set(sha, object)
      if (object.type === "commit") {
        const commit = parseCommit(object.payload)
        walk(commit.tree)
        for (const parent of commit.parents) walk(parent)
      } else if (object.type === "tree") {
        for (const entry of parseTree(object.payload)) walk(entry.sha)
      }
    }
    walk(tip)
    return [...out.values()]
  }

  diffTrees(repoId: string, oldSha: string | null, newSha: string | null): FileDiff[] {
    const oldFiles = oldSha ? this.filesAt(repoId, oldSha) : {}
    const newFiles = newSha ? this.filesAt(repoId, newSha) : {}
    const paths = new Set([...Object.keys(oldFiles), ...Object.keys(newFiles)])
    const diffs: FileDiff[] = []
    for (const path of [...paths].sort()) {
      const prev = oldFiles[path]
      const next = newFiles[path]
      if (prev?.sha === next?.sha) continue
      diffs.push(
        fileDiff(path, prev?.sha, next?.sha, prev?.content, next?.content),
      )
    }
    return diffs
  }

  merge(repoId: string, input: MergeInput): MergeResult {
    const oursRef = canonicalRef(input.oursRef)
    const oursSha = this.resolveRef(repoId, oursRef)
    const theirsSha = this.resolveRef(repoId, input.theirsSha) ?? input.theirsSha
    if (!this.lookupObject(repoId, theirsSha)) {
      throw new GitError(`theirs ${input.theirsSha} not found`)
    }
    if (!oursSha) {
      this.push(repoId, {
        pack: { objects: [] },
        refUpdates: [{ name: oursRef, oldSha: null, newSha: theirsSha }],
      })
      return { mergeable: true, sha: theirsSha, fastForward: true }
    }
    if (oursSha === theirsSha) {
      return { mergeable: true, sha: oursSha, fastForward: true }
    }
    if (this.isAncestor(repoId, oursSha, theirsSha)) {
      this.push(repoId, {
        pack: { objects: [] },
        refUpdates: [{ name: oursRef, oldSha: oursSha, newSha: theirsSha }],
      })
      return { mergeable: true, sha: theirsSha, fastForward: true }
    }
    if (this.isAncestor(repoId, theirsSha, oursSha)) {
      return { mergeable: true, sha: oursSha, fastForward: true }
    }
    const baseSha = this.mergeBase(repoId, oursSha, theirsSha)
    const get = (sha: string) => this.lookupObject(repoId, sha)
    const oursCommit = parseCommit(this.requireObject(this.repo(repoId), oursSha).payload)
    const theirsCommit = parseCommit(this.requireObject(this.repo(repoId), theirsSha).payload)
    const baseFiles = baseSha
      ? flattenTree(get, parseCommit(this.requireObject(this.repo(repoId), baseSha).payload).tree)
      : {}
    const oursFiles = flattenTree(get, oursCommit.tree)
    const theirsFiles = flattenTree(get, theirsCommit.tree)
    const paths = new Set([
      ...Object.keys(baseFiles),
      ...Object.keys(oursFiles),
      ...Object.keys(theirsFiles),
    ])
    const merged: Record<string, string> = {}
    const conflicts: string[] = []
    for (const path of paths) {
      const base = baseFiles[path]?.content
      const ours = oursFiles[path]?.content
      const theirs = theirsFiles[path]?.content
      if (ours === theirs) {
        if (ours != null) merged[path] = ours
      } else if (ours === base) {
        if (theirs != null) merged[path] = theirs
      } else if (theirs === base) {
        if (ours != null) merged[path] = ours
      } else {
        conflicts.push(path)
      }
    }
    if (conflicts.length) return { mergeable: false, conflicts }
    const built = buildCommit({
      files: merged,
      parents: [oursSha, theirsSha],
      author: input.author,
      message: input.message,
    })
    this.push(repoId, {
      pack: { objects: built.objects },
      refUpdates: [{ name: oursRef, oldSha: oursSha, newSha: built.commitSha }],
    })
    return { mergeable: true, sha: built.commitSha, fastForward: false }
  }

  fork(repoId: string, input: { newOwner: string; newName: string }): string {
    const source = this.repo(repoId)
    const id = this.createRepository({ owner: input.newOwner, name: input.newName })
    const dest = this.repo(id)
    dest.packs = source.packs.map(clonePack)
    dest.wal = new Map(
      [...source.wal.entries()].map(([key, value]) => [key, structuredClone(value)]),
    )
    dest.index = { ...source.index }
    dest.defaultBranch = source.defaultBranch
    dest.cache = null
    return id
  }

  compact(repoId: string): { packId: string } {
    const repo = this.repo(repoId)
    const materialized = this.materialize(repoId)
    const reachable = new Map<string, PackedObject>()
    for (const [name, value] of materialized.refs) {
      if (name === HEAD || value.startsWith("ref: ")) continue
      for (const object of this.fetchReachable(repoId, name)) {
        reachable.set(object.sha, object)
      }
    }
    const packId = this.nextId("pack")
    repo.packs.push({
      id: packId,
      objects: [...reachable.values()].map(clonePacked),
    })
    const expectedEtag = repo.index.etag
    const entry: WalEntry = {
      type: "compaction",
      id: this.nextId("wal"),
      prevId: repo.index.headEntryId,
      packIds: [packId],
      timestamp: Date.now(),
    }
    repo.wal.set(entry.id, entry)
    if (
      !this.compareAndSwapIndex(repoId, expectedEtag, {
        headEntryId: entry.id,
        etag: expectedEtag + 1,
      })
    ) {
      throw new CasError()
    }
    return { packId }
  }

  commitFiles(
    repoId: string,
    input: {
      files: Record<string, string>
      message: string
      ref?: string
      author: Ident
      parents?: string[]
      force?: boolean
    },
  ): { commitSha: string; treeSha: string } {
    const ref = canonicalRef(input.ref ?? DEFAULT_REF)
    const current = this.resolveRef(repoId, ref)
    const parents = input.parents ?? (current ? [current] : [])
    const built = buildCommit({
      files: input.files,
      parents,
      author: input.author,
      message: input.message,
    })
    this.push(repoId, {
      pack: { objects: built.objects },
      refUpdates: [{ name: ref, oldSha: current, newSha: built.commitSha }],
      force: input.force,
    })
    return { commitSha: built.commitSha, treeSha: built.treeSha }
  }

  readFiles(repoId: string, ref: string): Record<string, string> {
    const sha = this.resolveRef(repoId, ref)
    if (!sha) return {}
    const files = this.filesAt(repoId, sha)
    return Object.fromEntries(
      Object.entries(files).map(([path, file]) => [path, file.content]),
    )
  }

  isAncestor(repoId: string, ancestor: string, descendant: string): boolean {
    if (ancestor === descendant) return true
    const visited = new Set<string>()
    const stack = [descendant]
    while (stack.length) {
      const sha = stack.pop()!
      if (sha === ancestor) return true
      if (visited.has(sha)) continue
      visited.add(sha)
      const object = this.lookupObject(repoId, sha)
      if (!object || object.type !== "commit") continue
      stack.push(...parseCommit(object.payload).parents)
    }
    return false
  }

  serialize(): SerializedGit {
    const repos: SerializedRepo[] = []
    for (const repo of this.repos.values()) {
      repos.push({
        id: repo.id,
        packs: repo.packs.map((pack) => ({
          id: pack.id,
          objects: pack.objects.map((object) => ({
            type: object.type,
            sha: object.sha,
            payloadHex: toHex(object.payload),
          })),
        })),
        wal: [...repo.wal.values()],
        index: { ...repo.index },
        defaultBranch: repo.defaultBranch,
      })
    }
    return { repos, seq: this.seq }
  }

  static deserialize(data: SerializedGit): GitStore {
    const store = new GitStore()
    store.seq = data.seq ?? 0
    for (const repo of data.repos) {
      const state: RepoState = {
        id: repo.id,
        packs: repo.packs.map((pack) => ({
          id: pack.id,
          objects: pack.objects.map((object) => ({
            type: object.type,
            sha: object.sha,
            payload: fromHex(object.payloadHex),
          })),
        })),
        wal: new Map(repo.wal.map((entry) => [entry.id, entry])),
        index: { ...repo.index },
        defaultBranch: repo.defaultBranch,
        cache: null,
        locks: new Set(),
        txns: new Map(),
      }
      store.repos.set(repo.id, state)
    }
    return store
  }

  private repo(id: string): RepoState {
    const repo = this.repos.get(id)
    if (!repo) throw new GitError(`unknown repository ${id}`)
    return repo
  }

  private findTxn(id: string): PreparedTransaction {
    for (const repo of this.repos.values()) {
      const txn = repo.txns.get(id)
      if (txn) return txn
    }
    throw new GitError(`unknown transaction ${id}`)
  }

  private walChain(repo: RepoState): WalEntry[] {
    const out: WalEntry[] = []
    const seen = new Set<string>()
    let id = repo.index.headEntryId
    while (id && !seen.has(id)) {
      seen.add(id)
      const entry = repo.wal.get(id)
      if (!entry) break
      out.push(entry)
      id = entry.prevId
    }
    out.reverse()
    return out
  }

  private lookupObject(repoId: string, sha: string): PackedObject | undefined {
    const normalized = sha.toLowerCase()
    const materialized = this.materialize(repoId)
    const published = materialized.objects.get(normalized)
    if (published) return published
    const repo = this.repo(repoId)
    for (const pack of repo.packs) {
      const object = pack.objects.find((item) => item.sha === normalized)
      if (object) return object
    }
    return undefined
  }

  private requireObject(repo: RepoState, sha: string): PackedObject {
    const object = this.lookupObject(repo.id, sha)
    if (!object) throw new GitError(`missing object ${sha}`)
    return object
  }

  private requireReachable(repoId: string, sha: string): PackedObject {
    const materialized = this.materialize(repoId)
    const object = materialized.objects.get(sha.toLowerCase())
    if (!object) throw new GitError(`unreachable object ${sha}`)
    return object
  }

  private filesAt(repoId: string, sha: string) {
    const object = this.lookupObject(repoId, sha)
    if (!object) throw new GitError(`object ${sha} not found`)
    const get = (id: string) => this.lookupObject(repoId, id)
    if (object.type === "commit") {
      return flattenTree(get, parseCommit(object.payload).tree)
    }
    if (object.type === "tree") return flattenTree(get, object.sha)
    throw new GitError(`cannot read files from blob ${sha}`)
  }

  private mergeBase(repoId: string, a: string, b: string): string | null {
    const ancestors = new Set<string>()
    const stack = [a]
    while (stack.length) {
      const sha = stack.pop()!
      if (ancestors.has(sha)) continue
      ancestors.add(sha)
      const object = this.lookupObject(repoId, sha)
      if (object?.type === "commit") {
        stack.push(...parseCommit(object.payload).parents)
      }
    }
    const queue = [b]
    const visited = new Set<string>()
    while (queue.length) {
      const sha = queue.shift()!
      if (visited.has(sha)) continue
      visited.add(sha)
      if (ancestors.has(sha)) return sha
      const object = this.lookupObject(repoId, sha)
      if (object?.type === "commit") {
        queue.push(...parseCommit(object.payload).parents)
      }
    }
    return null
  }
}

function canonicalRef(name: string): string {
  if (name === HEAD || name.startsWith("refs/")) return name
  if (name.startsWith("heads/") || name.startsWith("tags/")) return `refs/${name}`
  return `refs/heads/${name}`
}

function peelRef(materialized: Materialized, name: string): string | null {
  let current: string | undefined = materialized.refs.get(name)
  const seen = new Set<string>()
  while (current?.startsWith("ref: ")) {
    if (seen.has(current)) return null
    seen.add(current)
    const next = current.slice(5)
    current = materialized.refs.get(next)
  }
  return current ?? null
}

let singleton = new GitStore()

export function gitStore(): GitStore {
  return singleton
}

export function replaceGitStore(store: GitStore): void {
  singleton = store
}

export function resetGitStore(): GitStore {
  singleton = new GitStore()
  return singleton
}
