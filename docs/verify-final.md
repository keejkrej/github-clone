# Final verification

Workspace: `/home/jack/workspace/github-clone`  
Date: 2026-09-02  
Scope: Fixer slice vs `docs/mvp-spec.md`.

**ready: yes**

| Check | Result |
|-------|--------|
| `pnpm exec tsx --test lib/git/git.test.ts` | PASS (9/9) |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS (TypeScript checked; `ignoreBuildErrors: false`) |
| Routes | All spec routes plus `/[owner]/[repo]/compare/[[...range]]` for opening PRs |
| Theme | Default shadcn tokens in `:root` / `.dark` |
| Northstar / v0 copy | None in product UI, README, or package name |
| Merge | `mergePull` → `GitStore.merge` → `push` (pack + WAL index CAS + ref txn) |
| Seed | Built through Git APIs; session user `octocat` |

---

## What was fixed

### Git engine

- `resolveRef(sha)` only returns objects published through the WAL index. A pack stored without a committed ref transaction is invisible to the file browser, not just to `log` / `ls-tree` of a branch.
- Tests 2 and 9 now assert that a dangling commit SHA does not resolve.

Merge was already WAL-backed (`GitStore.merge` calls `push`). No change required there.

### Hydration / stale Git views

- Relative timestamps render through `RelativeTime` (`suppressHydrationWarning` + client tick) so SSR vs browser clocks do not mismatch.
- Contribution heatmap days are UTC, not local `setHours(0)`.
- Commit datetimes format in UTC.
- File table, blob view, go-to-file, tree, commits, and commit diffs memoize on platform `rev`, so localStorage hydrate / merge updates the tree instead of showing a stale seed snapshot.

### Missing “open PR” path

- Green **New pull request** on the repo pulls list.
- Compare page `/{owner}/{repo}/compare/{base}...{head}`: branch pickers, commit list, diffs, create-PR form. Existing open PRs link through instead of duplicating.
- Non-default branch code view shows **Compare & pull request** (or **View pull request** when one exists).

### Seed / persistence

- `vercel/next.js` has a `canary` branch (second branch with a real extra commit).
- Platform snapshot version bumped to `2` so old localStorage is discarded and the new seed (including `canary`) loads.

### Dead / leftover chrome

- Header **New gist** is disabled (Coming soon), not a fake `/new` link.
- Header **New issue** goes to `octocat/hello-world/issues/new`.
- Review-changes composer uses shadcn `Popover` + `Textarea`.
- New-issue labels use shadcn `Checkbox`.
- README v0 generator copy removed; product name is GitHub.
- `package.json` name is `github-clone`.
- `next.config.mjs` typechecks on `pnpm build`.

Theme was already stock shadcn neutral; GitHub semantics remain additive utilities (`.gh-open`, `.gh-closed`, `.gh-merged`, language dots, diff backgrounds).

---

## Test results

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

`pnpm exec tsx --test lib/git/git.test.ts` — exit 0.

---

## Build results

`pnpm exec tsc --noEmit --pretty false` — exit 0, no diagnostics.

`pnpm build` — exit 0.

```
✓ Compiled successfully
  Running TypeScript ...
  Finished TypeScript in 2.2s ...
✓ Generating static pages using 15 workers (8/8)
```

TypeScript is no longer skipped. Route table includes `/[owner]/[repo]/compare/[[...range]]` plus every spec route (`/`, `/new`, `/search`, `/issues`, `/pulls`, `/notifications`, profile, repo code/tree/blob, commits/commit, issues, pulls, PR conversation/commits/files).

---

## Non-blocking leftovers

- `/new` visibility still uses native radio inputs (not a custom primitive set).
- Repo tab bar is custom `UnderlineNav` (real Next.js links) rather than shadcn `Tabs`.
- Actions / Projects / Security / Insights remain disabled “Coming soon”, as the spec allows.
- SHA-1 is pure JS (browser + Node); digests match Node `crypto` and Git empty blob/tree IDs.
