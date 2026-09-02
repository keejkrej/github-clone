import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { describe, it } from "node:test"

import { utf8 } from "./bytes"
import {
  CasError,
  GitStore,
  NonFastForwardError,
  buildCommit,
  hashObject,
  serializeTree,
} from "./index"
import type { Ident } from "./types"

const author: Ident = {
  name: "Octocat",
  email: "octocat@github.local",
  timestamp: 1_700_000_000,
  tz: "+0000",
}

function nodeHash(type: "blob" | "tree" | "commit", payload: Uint8Array): string {
  const header = Buffer.from(`${type} ${payload.byteLength}\0`, "utf8")
  return createHash("sha1").update(header).update(payload).digest("hex")
}

describe("git engine", () => {
  it("1. blob/tree/commit hashing is stable; trees with same entries hash equal", () => {
    const hello = utf8("hello")
    const blobSha = hashObject("blob", hello)
    assert.equal(blobSha, hashObject("blob", hello))
    assert.equal(blobSha, nodeHash("blob", hello))
    assert.equal(hashObject("blob", utf8("")), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391")

    const entries = [
      { mode: "100644" as const, name: "b.txt", sha: blobSha },
      { mode: "100644" as const, name: "a.txt", sha: blobSha },
    ]
    const treeA = serializeTree(entries)
    const treeB = serializeTree([...entries].reverse())
    assert.equal(hashObject("tree", treeA), hashObject("tree", treeB))
    assert.equal(hashObject("tree", treeA), nodeHash("tree", treeA))

    const built = buildCommit({
      files: { "a.txt": "hello", "b.txt": "hello" },
      parents: [],
      author,
      message: "init",
    })
    const again = buildCommit({
      files: { "b.txt": "hello", "a.txt": "hello" },
      parents: [],
      author,
      message: "init",
    })
    assert.equal(built.treeSha, again.treeSha)
    assert.equal(built.commitSha, again.commitSha)
    const commitPayload = built.objects.find((object) => object.sha === built.commitSha)!.payload
    assert.equal(built.commitSha, nodeHash("commit", commitPayload))
  })

  it("2. push pack then omit ref update → log(main) does not show the commit", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "hidden" })
    const built = buildCommit({
      files: { "secret.txt": "nope" },
      parents: [],
      author,
      message: "dangling",
    })
    git.storePack(repo, { objects: built.objects })
    assert.equal(git.log(repo, "main").length, 0)
    assert.equal(git.lsTree(repo, "main").length, 0)
    assert.equal(git.resolveRef(repo, "main"), null)
    assert.equal(git.resolveRef(repo, built.commitSha), null)
  })

  it("3. push pack + ref txn → commit is the tip of main; lsTree shows files", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "hello" })
    const built = buildCommit({
      files: { "README.md": "# Hello\n", "src/index.ts": "export {}\n" },
      parents: [],
      author,
      message: "initial commit",
    })
    git.push(repo, {
      pack: { objects: built.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: null, newSha: built.commitSha }],
    })
    const log = git.log(repo, "main")
    assert.equal(log.length, 1)
    assert.equal(log[0].sha, built.commitSha)
    const tree = git.lsTree(repo, "main")
    assert.deepEqual(
      tree.map((entry) => entry.name).sort(),
      ["README.md", "src"],
    )
    const src = git.lsTree(repo, "main", "src")
    assert.equal(src.length, 1)
    assert.equal(src[0].name, "index.ts")
    const blob = git.catFile(repo, src[0].sha)
    assert.equal(blob.type, "blob")
    if (blob.type === "blob") assert.equal(blob.content, "export {}\n")
  })

  it("4. non-FF push rejected; force succeeds", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "ff" })
    const c1 = buildCommit({
      files: { "a.txt": "one" },
      parents: [],
      author,
      message: "one",
    })
    git.push(repo, {
      pack: { objects: c1.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: null, newSha: c1.commitSha }],
    })
    const c2 = buildCommit({
      files: { "a.txt": "two" },
      parents: [c1.commitSha],
      author: { ...author, timestamp: author.timestamp + 1 },
      message: "two",
    })
    git.push(repo, {
      pack: { objects: c2.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: c1.commitSha, newSha: c2.commitSha }],
    })
    const other = buildCommit({
      files: { "a.txt": "other" },
      parents: [c1.commitSha],
      author: { ...author, timestamp: author.timestamp + 2 },
      message: "other",
    })
    assert.throws(
      () =>
        git.push(repo, {
          pack: { objects: other.objects },
          refUpdates: [{ name: "refs/heads/main", oldSha: c2.commitSha, newSha: other.commitSha }],
        }),
      NonFastForwardError,
    )
    assert.equal(git.log(repo, "main")[0].sha, c2.commitSha)
    git.push(repo, {
      pack: { objects: other.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: c2.commitSha, newSha: other.commitSha }],
      force: true,
    })
    assert.equal(git.log(repo, "main")[0].sha, other.commitSha)
  })

  it("5. concurrent CAS: second push with stale etag fails; retry with new etag succeeds", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "cas" })
    const first = buildCommit({
      files: { "a.txt": "1" },
      parents: [],
      author,
      message: "first",
    })
    const stale = git.getWalIndex(repo).etag
    git.push(repo, {
      pack: { objects: first.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: null, newSha: first.commitSha }],
      expectedEtag: stale,
    })
    const second = buildCommit({
      files: { "a.txt": "2" },
      parents: [first.commitSha],
      author: { ...author, timestamp: author.timestamp + 1 },
      message: "second",
    })
    assert.throws(
      () =>
        git.push(repo, {
          pack: { objects: second.objects },
          refUpdates: [{ name: "refs/heads/main", oldSha: first.commitSha, newSha: second.commitSha }],
          expectedEtag: stale,
        }),
      CasError,
    )
    assert.equal(git.log(repo, "main")[0].sha, first.commitSha)
    git.push(repo, {
      pack: { objects: second.objects },
      refUpdates: [{ name: "refs/heads/main", oldSha: first.commitSha, newSha: second.commitSha }],
      expectedEtag: git.getWalIndex(repo).etag,
    })
    assert.equal(git.log(repo, "main")[0].sha, second.commitSha)
  })

  it("6. fork copies history; pushing to fork does not change upstream refs", () => {
    const git = new GitStore()
    const upstream = git.createRepository({ owner: "facebook", name: "react" })
    const c1 = git.commitFiles(upstream, {
      files: { "README.md": "# React\n", "src/index.ts": "export const v = 1\n" },
      message: "init",
      author,
    })
    git.commitFiles(upstream, {
      files: { "README.md": "# React\n", "src/index.ts": "export const v = 2\n" },
      message: "bump",
      author: { ...author, timestamp: author.timestamp + 1 },
    })
    const fork = git.fork(upstream, { newOwner: "gaearon", newName: "react" })
    assert.deepEqual(
      git.log(fork, "main").map((entry) => entry.message.trim()),
      git.log(upstream, "main").map((entry) => entry.message.trim()),
    )
    git.commitFiles(fork, {
      files: {
        "README.md": "# React fork\n",
        "src/index.ts": "export const v = 3\n",
      },
      message: "fork work",
      author: { ...author, timestamp: author.timestamp + 2 },
    })
    assert.equal(git.log(upstream, "main")[0].sha, git.log(upstream, "main")[0].sha)
    assert.notEqual(git.log(fork, "main")[0].sha, git.log(upstream, "main")[0].sha)
    assert.equal(git.readFiles(upstream, "main")["README.md"], "# React\n")
    assert.equal(git.readFiles(fork, "main")["README.md"], "# React fork\n")
    assert.equal(c1.commitSha, git.log(upstream, "main")[1].sha)
  })

  it("7. merge FF and non-FF (two files on two branches)", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "merge" })
    const base = git.commitFiles(repo, {
      files: { "README.md": "base\n" },
      message: "base",
      author,
    })
    const ff = git.commitFiles(repo, {
      files: { "README.md": "base\n", "ff.txt": "ahead\n" },
      message: "ff commit",
      ref: "refs/heads/topic-ff",
      parents: [base.commitSha],
      author: { ...author, timestamp: author.timestamp + 1 },
    })
    const ffMerge = git.merge(repo, {
      oursRef: "refs/heads/main",
      theirsSha: ff.commitSha,
      author: { ...author, timestamp: author.timestamp + 2 },
      message: "ff merge",
    })
    assert.equal(ffMerge.mergeable, true)
    if (ffMerge.mergeable) {
      assert.equal(ffMerge.fastForward, true)
      assert.equal(ffMerge.sha, ff.commitSha)
    }
    assert.equal(git.resolveRef(repo, "main"), ff.commitSha)

    git.commitFiles(repo, {
      files: { "README.md": "base\n", "ff.txt": "ahead\n", "ours.txt": "main\n" },
      message: "ours file",
      author: { ...author, timestamp: author.timestamp + 3 },
    })
    const diverged = git.commitFiles(repo, {
      files: { "README.md": "base\n", "theirs.txt": "topic\n" },
      message: "theirs file",
      ref: "refs/heads/topic",
      parents: [base.commitSha],
      author: { ...author, timestamp: author.timestamp + 4 },
    })
    const merged = git.merge(repo, {
      oursRef: "main",
      theirsSha: diverged.commitSha,
      author: { ...author, timestamp: author.timestamp + 5 },
      message: "Merge branch 'topic'",
    })
    assert.equal(merged.mergeable, true)
    if (merged.mergeable) assert.equal(merged.fastForward, false)
    const files = git.readFiles(repo, "main")
    assert.equal(files["ours.txt"], "main\n")
    assert.equal(files["theirs.txt"], "topic\n")
    const tip = git.log(repo, "main")[0]
    assert.equal(tip.parents.length, 2)
  })

  it("8. compaction preserves log and lsTree", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "compact" })
    git.commitFiles(repo, {
      files: { "a.txt": "1", "src/b.ts": "b" },
      message: "one",
      author,
    })
    git.commitFiles(repo, {
      files: { "a.txt": "2", "src/b.ts": "b" },
      message: "two",
      author: { ...author, timestamp: author.timestamp + 1 },
    })
    git.commitFiles(repo, {
      files: { "a.txt": "3", "src/b.ts": "b3" },
      message: "three",
      author: { ...author, timestamp: author.timestamp + 2 },
    })
    const beforeLog = git.log(repo, "main").map((entry) => entry.sha)
    const beforeTree = git.lsTree(repo, "main")
    const beforeFiles = git.readFiles(repo, "main")
    git.compact(repo)
    assert.deepEqual(
      git.log(repo, "main").map((entry) => entry.sha),
      beforeLog,
    )
    assert.deepEqual(git.lsTree(repo, "main"), beforeTree)
    assert.deepEqual(git.readFiles(repo, "main"), beforeFiles)
  })

  it("9. dangling objects after aborted txn are not reachable", () => {
    const git = new GitStore()
    const repo = git.createRepository({ owner: "octocat", name: "abort" })
    const published = git.commitFiles(repo, {
      files: { "keep.txt": "safe" },
      message: "keep",
      author,
    })
    const dangling = buildCommit({
      files: { "keep.txt": "safe", "leak.txt": "secret" },
      parents: [published.commitSha],
      author: { ...author, timestamp: author.timestamp + 1 },
      message: "should not publish",
    })
    git.storePack(repo, { objects: dangling.objects })
    const txn = git.prepareRefTransaction(repo, [
      {
        name: "refs/heads/main",
        oldSha: published.commitSha,
        newSha: dangling.commitSha,
      },
    ])
    git.abortRefTransaction(txn)
    assert.equal(git.resolveRef(repo, "main"), published.commitSha)
    assert.equal(git.resolveRef(repo, dangling.commitSha), null)
    assert.equal(git.log(repo, "main").length, 1)
    assert.ok(!git.lsTree(repo, "main").some((entry) => entry.name === "leak.txt"))
    assert.deepEqual(git.log(repo, "main").map((entry) => entry.sha), [published.commitSha])
    const reachable = git.fetchReachable(repo, "main").map((object) => object.sha)
    assert.ok(!reachable.includes(dangling.commitSha))
  })
})
