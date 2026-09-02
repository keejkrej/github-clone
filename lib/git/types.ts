export type GitObjectType = "blob" | "tree" | "commit"

export type TreeMode = "100644" | "040000" | "100755"

export type Ident = {
  name: string
  email: string
  timestamp: number
  tz: string
}

export type TreeEntry = {
  mode: TreeMode
  name: string
  sha: string
}

export type Commit = {
  tree: string
  parents: string[]
  author: Ident
  committer: Ident
  message: string
}

export type PackedObject = {
  type: GitObjectType
  sha: string
  payload: Uint8Array
}

export type Packfile = {
  id: string
  objects: PackedObject[]
}

export type RefUpdate = {
  name: string
  oldSha: string | null
  newSha: string | null
}

export type WalPushEntry = {
  type: "push"
  id: string
  prevId: string | null
  packId: string
  refUpdates: RefUpdate[]
  timestamp: number
}

export type WalCompactionEntry = {
  type: "compaction"
  id: string
  prevId: string | null
  packIds: string[]
  timestamp: number
}

export type WalEntry = WalPushEntry | WalCompactionEntry

export type WalIndex = {
  headEntryId: string | null
  etag: number
}

export type CreateRepositoryInput = {
  owner: string
  name: string
  visibility?: "public" | "private"
  description?: string
}

export type PushInput = {
  pack: { id?: string; objects: PackedObject[] }
  refUpdates: RefUpdate[]
  force?: boolean
  expectedEtag?: number
}

export type MergeInput = {
  oursRef: string
  theirsSha: string
  author: Ident
  message: string
}

export type MergeResult =
  | { mergeable: true; sha: string; fastForward: boolean }
  | { mergeable: false; conflicts: string[] }

export type LogEntry = {
  sha: string
  tree: string
  parents: string[]
  author: Ident
  committer: Ident
  message: string
}

export type LsTreeEntry = TreeEntry & {
  type: "blob" | "tree"
}

export type DiffHunkLine = {
  type: "context" | "add" | "del"
  text: string
}

export type DiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffHunkLine[]
}

export type FileDiff = {
  path: string
  status: "added" | "deleted" | "modified"
  oldSha?: string
  newSha?: string
  oldContent?: string
  newContent?: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export type CatFileResult =
  | { type: "blob"; sha: string; content: string }
  | { type: "tree"; sha: string; entries: TreeEntry[] }
  | { type: "commit"; sha: string; commit: Commit }

export type PreparedTransaction = {
  id: string
  repoId: string
  updates: RefUpdate[]
  force: boolean
}

export type SerializedPackedObject = {
  type: GitObjectType
  sha: string
  payloadHex: string
}

export type SerializedPackfile = {
  id: string
  objects: SerializedPackedObject[]
}

export type SerializedRepo = {
  id: string
  packs: SerializedPackfile[]
  wal: WalEntry[]
  index: WalIndex
  defaultBranch: string
}

export type SerializedGit = {
  repos: SerializedRepo[]
  seq: number
}
