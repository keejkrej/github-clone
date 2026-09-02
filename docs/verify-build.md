# Build verification

Workspace: `/home/jack/workspace/github-clone`  
Date: 2026-09-02  
Verifier: `pnpm` v11.25.0, Next.js 16.3.3, TypeScript 5.7.3  
Production code was not edited.

**Overall: PASS**

| Step | Command | Exit code | Result |
|------|---------|-----------|--------|
| 1 | `pnpm install` | 0 | PASS |
| 2 | `pnpm exec tsx --test lib/git/git.test.ts` | 0 | PASS (9/9 tests) |
| 3 | `pnpm build` | 0 | PASS |
| 4 | `pnpm exec tsc --noEmit --pretty false` (extra; Next skipped types) | 0 | PASS (no TypeScript errors) |

`next.config.mjs` has `typescript.ignoreBuildErrors: true`, so `pnpm build` prints `Skipping validation of types` even on success. TypeScript was checked separately with `tsc --noEmit`.

---

## 1. `pnpm install`

**Result: PASS** (exit 0)

```
Already up to date
Done in 225ms using pnpm v11.25.0
```

`node_modules` was already present. Install confirmed lockfile and deps were in sync.

---

## 2. `pnpm exec tsx --test lib/git/git.test.ts`

**Result: PASS** (exit 0)  
**Tests: 9 passed, 0 failed**

```
▶ git engine
  ✔ 1. blob/tree/commit hashing is stable; trees with same entries hash equal (1.468189ms)
  ✔ 2. push pack then omit ref update → log(main) does not show the commit (0.489233ms)
  ✔ 3. push pack + ref txn → commit is the tip of main; lsTree shows files (1.633207ms)
  ✔ 4. non-FF push rejected; force succeeds (0.770207ms)
  ✔ 5. concurrent CAS: second push with stale etag fails; retry with new etag succeeds (0.457543ms)
  ✔ 6. fork copies history; pushing to fork does not change upstream refs (0.812145ms)
  ✔ 7. merge FF and non-FF (two files on two branches) (0.817094ms)
  ✔ 8. compaction preserves log and lsTree (0.665481ms)
  ✔ 9. dangling objects after aborted txn are not reachable (0.349893ms)
✔ git engine (8.246424ms)
ℹ tests 9
ℹ suites 1
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 85.161154
```

---

## 3. `pnpm build`

**Result: PASS** (exit 0)

```
$ next build
▲ Next.js 16.3.3 (Turbopack)
✓ Running next.config.mjs took 7ms

  Creating an optimized production build ...
✓ Compiled successfully in 1222ms
  Skipping validation of types
  Finished TypeScript config validation in 3ms ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/8) ...
  Generating static pages using 15 workers (2/8) 
  Generating static pages using 15 workers (4/8) 
  Generating static pages using 15 workers (6/8) 
✓ Generating static pages using 15 workers (8/8) in 180ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /[owner]
├ ƒ /[owner]/[repo]
├ ƒ /[owner]/[repo]/blob/[...path]
├ ƒ /[owner]/[repo]/commit/[sha]
├ ƒ /[owner]/[repo]/commits/[[...ref]]
├ ƒ /[owner]/[repo]/issues
├ ƒ /[owner]/[repo]/issues/[number]
├ ƒ /[owner]/[repo]/issues/new
├ ƒ /[owner]/[repo]/pull/[number]
├ ƒ /[owner]/[repo]/pull/[number]/commits
├ ƒ /[owner]/[repo]/pull/[number]/files
├ ƒ /[owner]/[repo]/pulls
├ ƒ /[owner]/[repo]/tree/[...path]
├ ○ /issues
├ ○ /new
├ ○ /notifications
├ ○ /pulls
└ ○ /search


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Compile: success. Static generation: 8/8 pages. No build errors.

---

## TypeScript errors

**None.**

`pnpm build` did not type-check the app because of:

```js
typescript: {
  ignoreBuildErrors: true,
}
```

in `next.config.mjs`. Evidence from the build log:

```
Skipping validation of types
Finished TypeScript config validation in 3ms ...
```

To capture actual TypeScript errors, this extra command was run (not a production-code change):

```
pnpm exec tsc --noEmit --pretty false
```

**Result: PASS** (exit 0, empty stdout/stderr)

`tsc` reported zero diagnostics. No TypeScript errors.

---

## Notes

- No production files were modified in this step.
- This file is the only write from verification.
- If type-checking should run as part of `next build`, set `typescript.ignoreBuildErrors` to `false` in a later change.
