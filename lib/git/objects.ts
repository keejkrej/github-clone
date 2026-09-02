import { concatBytes, fromHex, toHex, utf8, utf8Decode } from "./bytes"
import { hashObject } from "./hash"
import type {
  Commit,
  Ident,
  PackedObject,
  TreeEntry,
  TreeMode,
} from "./types"

export function encodeIdent(ident: Ident): string {
  return `${ident.name} <${ident.email}> ${ident.timestamp} ${ident.tz}`
}

export function parseIdent(raw: string): Ident {
  const match = raw.match(/^(.*) <([^>]+)> (\d+) ([+-]\d{4})$/)
  if (!match) {
    throw new Error(`invalid ident: ${raw}`)
  }
  return {
    name: match[1],
    email: match[2],
    timestamp: Number(match[3]),
    tz: match[4],
  }
}

function serializeMode(mode: TreeMode): string {
  return mode === "040000" ? "40000" : mode
}

function parseMode(mode: string): TreeMode {
  if (mode === "40000" || mode === "040000") return "040000"
  if (mode === "100644" || mode === "100755") return mode
  throw new Error(`unsupported tree mode ${mode}`)
}

function treeSortKey(entry: TreeEntry): string {
  return entry.mode === "040000" ? `${entry.name}/` : entry.name
}

export function sortTreeEntries(entries: TreeEntry[]): TreeEntry[] {
  return [...entries].sort((a, b) => {
    const ka = treeSortKey(a)
    const kb = treeSortKey(b)
    if (ka < kb) return -1
    if (ka > kb) return 1
    return 0
  })
}

export function serializeTree(entries: TreeEntry[]): Uint8Array {
  const parts: Uint8Array[] = []
  for (const entry of sortTreeEntries(entries)) {
    const prefix = utf8(`${serializeMode(entry.mode)} ${entry.name}`)
    const sha = fromHex(entry.sha)
    if (sha.byteLength !== 20) {
      throw new Error(`tree entry sha must be 20 bytes: ${entry.name}`)
    }
    parts.push(concatBytes([prefix, Uint8Array.of(0), sha]))
  }
  return concatBytes(parts)
}

export function parseTree(payload: Uint8Array): TreeEntry[] {
  const entries: TreeEntry[] = []
  let i = 0
  while (i < payload.length) {
    let sp = i
    while (sp < payload.length && payload[sp] !== 0x20) sp++
    const mode = parseMode(utf8Decode(payload.subarray(i, sp)))
    let nul = sp + 1
    while (nul < payload.length && payload[nul] !== 0) nul++
    const name = utf8Decode(payload.subarray(sp + 1, nul))
    const shaStart = nul + 1
    const sha = toHex(payload.subarray(shaStart, shaStart + 20))
    entries.push({ mode, name, sha })
    i = shaStart + 20
  }
  return entries
}

export function serializeCommit(commit: Commit): Uint8Array {
  const message = commit.message.endsWith("\n") ? commit.message : `${commit.message}\n`
  const lines = [
    `tree ${commit.tree}`,
    ...commit.parents.map((parent) => `parent ${parent}`),
    `author ${encodeIdent(commit.author)}`,
    `committer ${encodeIdent(commit.committer)}`,
    "",
    message,
  ]
  return utf8(lines.join("\n"))
}

export function parseCommit(payload: Uint8Array): Commit {
  const text = utf8Decode(payload)
  const split = text.indexOf("\n\n")
  if (split < 0) throw new Error("invalid commit: missing message")
  const header = text.slice(0, split)
  const message = text.slice(split + 2)
  let tree = ""
  const parents: string[] = []
  let author: Ident | null = null
  let committer: Ident | null = null
  for (const line of header.split("\n")) {
    if (line.startsWith("tree ")) tree = line.slice(5)
    else if (line.startsWith("parent ")) parents.push(line.slice(7))
    else if (line.startsWith("author ")) author = parseIdent(line.slice(7))
    else if (line.startsWith("committer ")) committer = parseIdent(line.slice(10))
  }
  if (!tree || !author || !committer) {
    throw new Error("invalid commit header")
  }
  return { tree, parents, author, committer, message }
}

export function blobObject(content: string | Uint8Array): PackedObject {
  const payload = typeof content === "string" ? utf8(content) : content
  return { type: "blob", sha: hashObject("blob", payload), payload }
}

export function treeObject(entries: TreeEntry[]): PackedObject {
  const payload = serializeTree(entries)
  return { type: "tree", sha: hashObject("tree", payload), payload }
}

export function commitObject(commit: Commit): PackedObject {
  const payload = serializeCommit(commit)
  return { type: "commit", sha: hashObject("commit", payload), payload }
}

type DirNode = {
  files: Map<string, { content: string; mode: TreeMode }>
  dirs: Map<string, DirNode>
}

function emptyDir(): DirNode {
  return { files: new Map(), dirs: new Map() }
}

export function buildTree(
  files: Record<string, string>,
  modes?: Record<string, TreeMode>,
): { treeSha: string; objects: PackedObject[] } {
  const root = emptyDir()
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/").filter(Boolean)
    if (parts.length === 0) continue
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      let next = node.dirs.get(parts[i])
      if (!next) {
        next = emptyDir()
        node.dirs.set(parts[i], next)
      }
      node = next
    }
    const mode = modes?.[path] ?? "100644"
    if (mode === "040000") {
      throw new Error(`file mode cannot be a tree: ${path}`)
    }
    node.files.set(parts[parts.length - 1], { content, mode })
  }

  const objects: PackedObject[] = []
  const seen = new Set<string>()

  const write = (node: DirNode): string => {
    const entries: TreeEntry[] = []
    for (const [name, child] of node.dirs) {
      const sha = write(child)
      entries.push({ mode: "040000", name, sha })
    }
    for (const [name, file] of node.files) {
      const blob = blobObject(file.content)
      if (!seen.has(blob.sha)) {
        objects.push(blob)
        seen.add(blob.sha)
      }
      entries.push({ mode: file.mode, name, sha: blob.sha })
    }
    const tree = treeObject(entries)
    if (!seen.has(tree.sha)) {
      objects.push(tree)
      seen.add(tree.sha)
    }
    return tree.sha
  }

  return { treeSha: write(root), objects }
}

export function buildCommit(input: {
  files: Record<string, string>
  parents: string[]
  author: Ident
  committer?: Ident
  message: string
  modes?: Record<string, TreeMode>
}): { commitSha: string; treeSha: string; objects: PackedObject[]; commit: Commit } {
  const { treeSha, objects } = buildTree(input.files, input.modes)
  const commit: Commit = {
    tree: treeSha,
    parents: input.parents,
    author: input.author,
    committer: input.committer ?? input.author,
    message: input.message,
  }
  const object = commitObject(commit)
  return {
    commitSha: object.sha,
    treeSha,
    objects: [...objects, object],
    commit,
  }
}

export function flattenTree(
  getObject: (sha: string) => PackedObject | undefined,
  treeSha: string,
  prefix = "",
): Record<string, { sha: string; mode: TreeMode; content: string }> {
  const obj = getObject(treeSha)
  if (!obj || obj.type !== "tree") {
    throw new Error(`not a tree: ${treeSha}`)
  }
  const out: Record<string, { sha: string; mode: TreeMode; content: string }> = {}
  for (const entry of parseTree(obj.payload)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.mode === "040000") {
      Object.assign(out, flattenTree(getObject, entry.sha, path))
    } else {
      const blob = getObject(entry.sha)
      if (!blob || blob.type !== "blob") {
        throw new Error(`missing blob ${entry.sha} for ${path}`)
      }
      out[path] = {
        sha: entry.sha,
        mode: entry.mode,
        content: utf8Decode(blob.payload),
      }
    }
  }
  return out
}
