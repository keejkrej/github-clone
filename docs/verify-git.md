# Git engine verification

Workspace: `/home/jack/workspace/github-clone`  
Date: 2026-09-02  
Scope: `docs/mvp-spec.md` Git engine section + `lib/git/` implementation (not tests alone).  
Production code was not edited.

**ready: yes**

`pnpm exec tsx --test lib/git/git.test.ts` — exit 0, 9/9 pass.

```
▶ git engine
  ✔ 1. blob/tree/commit hashing is stable; trees with same entries hash equal
  ✔ 2. push pack then omit ref update → log(main) does not show the commit
  ✔ 3. push pack + ref txn → commit is the tip of main; lsTree shows files
  ✔ 4. non-FF push rejected; force succeeds
  ✔ 5. concurrent CAS: second push with stale etag fails; retry with new etag succeeds
  ✔ 6. fork copies history; pushing to fork does not change upstream refs
  ✔ 7. merge FF and non-FF (two files on two branches)
  ✔ 8. compaction preserves log and lsTree
  ✔ 9. dangling objects after aborted txn are not reachable
ℹ tests 9  pass 9  fail 0
```

Claims below were confirmed by reading `lib/git/{hash,objects,engine,types}.ts`, then cross-checked with an independent Node `crypto` SHA-1 probe (empty blob `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, empty tree `4b825dc642cb6eb9a060e54bf8d69288fbee4904`, `sha1("abc")` = `a9993e364706816aba3e25717850c26c9cd0d89d`).

---

## Evidence

### SHA-1 Git object hashing exists — yes

| What | Where |
|------|--------|
| Pure-JS SHA-1 | `lib/git/hash.ts:9-78` |
| Git object header `type SP size NUL content`, then SHA-1 | `lib/git/hash.ts:80-85` |
| Exported `hashObject` | `lib/git/hash.ts:80`, re-export `lib/git/index.ts:1` |
| Blob/tree/commit payloads hashed as Git objects | `lib/git/objects.ts:118-131` |
| Tree bytes `mode SP name NUL sha-20` (Git `40000` for trees) | `lib/git/objects.ts:28-30`, `52-63` |
| Incoming pack objects rehashed; sha mismatch rejected | `lib/git/engine.ts:136-142` |

Not Node/Web Crypto as the spec suggested; the digest matches Node `crypto.createHash("sha1")` and the well-known Git empty blob/tree IDs.

### Push is pack + ref transaction — yes

`GitStore.push` (`lib/git/engine.ts:206-233`):

1. `storePack` — objects enter the pack list only (`engine.ts:134-147`, called at `209`).
2. `prepareRefTransaction` — lock each ref, check `oldSha`, reject non-FF unless `force`, require the new object exists (`149-187`, called at `212`).
3. Append a WAL `push` entry `{ packId, refUpdates }` (`213-221`).
4. `compareAndSwapIndex` — publish by swinging the WAL head (`223-225`, CAS at `126-132`).
5. `commitRefTransaction` on success (`226`); `abortRefTransaction` on failure (`229-231`).

Ref values are not written in `commitRefTransaction` itself (`189-196` only drops locks and clears cache). The atomic publish is the WAL index CAS; `materialize` (`235-262`) replays `walChain` from `index.headEntryId` and applies `entry.refUpdates`. That matches the spec rule that the WAL is source of truth and “publishing is the index pointer.”

### Objects are unreachable until refs commit — yes (for log / ls-tree / branch views)

| What | Where |
|------|--------|
| `storePack` does not touch WAL/index/refs | `engine.ts:134-147` |
| `materialize` loads objects only from packs named by WAL entries | `engine.ts:240-258` |
| `log` / `lsTree` / `fetchReachable` use `requireReachable` | `engine.ts:290-355` |
| `requireReachable` looks up `materialize().objects` only — throws if not WAL-published | `engine.ts:641-646` |
| Failed CAS / thrown prepare: pack may dangle; WAL head unchanged; txn aborted | `engine.ts:223-231` |
| `abortRefTransaction` drops locks, does not move refs | `engine.ts:198-204` |

A pack sitting in `repo.packs` with no WAL pointer is invisible to `log(main)` / `lsTree(main)` because those start at `resolveRef` of the branch (`264-271` peels materialized refs) and then walk with `requireReachable`.

Caveat (not a spec blocker): `lookupObject` (`622-633`) falls through to a scan of **all** packs, so `catFile` (`278-288`) and SHA `resolveRef` can read dangling objects if the caller already knows the SHA. Branch log/ls-tree still do not list them. Spec text only requires hiding from `log`, `ls-tree` of a branch, and the file browser.

### WAL + CAS linearizes pushes — yes

| What | Where |
|------|--------|
| WAL entry types `push` / `compaction` with `prevId` | `lib/git/types.ts:43-60` |
| Index `{ headEntryId, etag }` | `types.ts:62-65`, `engine.ts:100` |
| CAS: compare `etag`, then set head+etag and invalidate cache | `engine.ts:126-132` |
| Push refuses to ack unless CAS succeeds (`CasError`) | `engine.ts:223-225`, `44-48` |
| Stale `expectedEtag` cannot publish; orphan WAL row is not in `walChain` | `engine.ts:207-208`, `607-620` |
| Replay order is index-linked list, oldest first | `engine.ts:607-620`, used at `240` |

Single-threaded in-process CAS (MVP singleton). Still a linearization point: two pushes with the same etag, the second fails and leaves refs on the first tip.

### `log` / `lsTree` walk the DAG from refs — yes (they do not list the object DB)

**`log`** (`engine.ts:317-335`): `resolveRef` → stack from tip → parse commit → push `commit.parents`. No loop over `repo.packs` or `materialized.objects.keys()`.

**`lsTree`** (`engine.ts:290-315`): `resolveRef` → commit.tree or tree sha → `parseTree` → descend path parts. Returns that tree’s entries only.

`requireReachable` is a point lookup in the published map, not a scan-to-list. Compaction (`458-491`) *does* iterate refs and `fetchReachable`; that is packing, not `log`/`lsTree`.

### merge and fork exist — yes

| API | Where | Behavior |
|-----|--------|----------|
| `merge` | `engine.ts:373-442` | Unborn ours → empty-pack push of theirs. FF (`isAncestor` ours of theirs) → empty-pack ref txn. Already contained → no-op. Else 3-way on flattened trees (`400-429`); conflicts → `{ mergeable: false }`; else merge commit with two parents and `push` (`431-441`). |
| `fork` | `engine.ts:444-456` | `createRepository`, clone packs, `structuredClone` WAL, copy index. Later pushes to the fork append only on dest. |

Engine `fork` does not store a parent pointer (`RepoState` has none). Spec “set parent” is applied in the platform store (`lib/platform/store.ts` around the `gitStore().fork` call). Git-level copy + isolation holds.

---

## Blockers

None for the Git engine claims in `docs/mvp-spec.md`.

Non-blocking notes (do not flip `ready`):

1. `commitRefTransaction` does not mutate ref values; WAL CAS in `push` does. Standalone prepare+commit without a WAL write would not publish.
2. `lookupObject` / `catFile` can read unpublished pack objects by SHA. `log`/`lsTree` from a branch cannot.
3. `requireReachable` means “in a WAL-published pack,” not “DAG-reachable from current refs.” Abandoned objects from an old pack remain cat-able after force-push; they still do not show up in `log(main)` unless they are ancestors.
4. SHA-1 is pure JS, not Node/Web Crypto. Digests match Git.
5. CAS is in-process, appropriate for the module singleton MVP.

---

## Spec tests mapped

| # | Spec | Test | Impl |
|---|------|------|------|
| 1 | Stable blob/tree/commit hashes | `git.test.ts:29-61` | `hash.ts`, `objects.ts` |
| 2 | Pack without ref update hidden | `git.test.ts:63-76` | `storePack` + `log`/`lsTree` |
| 3 | Pack + ref txn visible | `git.test.ts:78-105` | `push` |
| 4 | Non-FF reject; force ok | `git.test.ts:107-151` | `prepareRefTransaction` `169-171` |
| 5 | Stale etag CAS fail + retry | `git.test.ts:153-190` | `compareAndSwapIndex` |
| 6 | Fork copy; isolation | `git.test.ts:192-223` | `fork` |
| 7 | Merge FF and 3-way | `git.test.ts:225-278` | `merge` |
| 8 | Compaction preserves log/tree | `git.test.ts:280-308` | `compact` |
| 9 | Aborted txn not reachable | `git.test.ts:310-339` | `abortRefTransaction` + `requireReachable` |
