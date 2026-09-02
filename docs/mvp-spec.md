# GitHub Clone MVP Spec

Finish an authentic GitHub clone in this Next.js App Router repo. Replace the current "Northstar" dashboard. The product is a working GitHub-like developer platform: Git hosting plus GitHub's social/collaboration business logic.

Workspace: `/home/jack/workspace/github-clone`

## Non-negotiables

1. **shadcn/ui primitives only for UI chrome.** Existing components live in `components/ui/` (Base UI / `base-nova`). Add more with `pnpm dlx shadcn@latest add <name> --yes`. Do not invent custom button/input/dialog primitives.
2. **Start from the default shadcn theme.** Reset `app/globals.css` `:root` and `.dark` to stock shadcn neutral tokens (see Theme). Do not keep the current blue "Northstar" palette. GitHub-semantic colors (open green, closed red, merged purple, language dots) are additive utilities, not a replacement theme.
3. **Git storage follows [Git at any scale](https://cursor.com/blog/git-at-any-scale).** Implement a real content-addressable Git object DAG, packfiles, reference transactions, and a linearizable WAL. Do not fake Git as a nested JSON file tree.
4. **Authentic GitHub product UI** (from Refero screens of github.com). Dark top bar, owner/repo header, underline tabs, file table, issues list, PR files split diff, profile with contrib heatmap. Not a generic SaaS dashboard.
5. **MVP must be interactive end-to-end.** Star, fork, create repo, open issue, comment, open PR, merge, browse files at a ref, view commit history. State lives in a singleton platform store the Git engine owns.

---

## Theme (default shadcn, then GitHub structure)

Replace customized `:root` / `.dark` in `app/globals.css` with default shadcn neutral:

```css
:root {
  color-scheme: light;
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
.dark {
  color-scheme: dark;
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

Remove the `prefers-color-scheme: dark` override that currently copies dark tokens onto `:root`. Light is the default product chrome (GitHub's logged-in product is a dark header on a light canvas). Keep `.dark` for completeness.

Additive GitHub semantic utilities in `@layer utilities` (do not change theme tokens):

- `.gh-open` text/icon `#1a7f37`
- `.gh-closed` `#cf222e`
- `.gh-merged` `#8250df`
- `.gh-draft` muted
- `.gh-add-bg` `#dafbe1` / `.gh-del-bg` `#ffebe9`
- language dots: JS `#f1e05a`, TS `#3178c6`, Python `#3572A5`, Go `#00ADD8`, CSS `#563d7c`, Rust `#dea584`

Header: `bg-foreground text-background` (near-black bar, light text). Green primary CTAs ("New issue", "Merge pull request", "Code") may use `bg-emerald-600 text-white hover:bg-emerald-700` as an exception to default primary — GitHub's green action is a core product cue.

Typography: system UI for chrome, `font-mono` for code, SHAs, file names in trees.

---

## Refero UI patterns (copy these layouts)

Screens studied (github.com):

- Repo code: `b5e83c68-8143-47d7-97bf-144d82d94aa3` (facebook/Ax)
- Issues: `1c4dd82d-3d2e-41d7-a105-0b1738e154f6`
- PR files: `4b64c360-ee73-4c4e-91e2-1c7a9b923f8b`
- Blob: `7964a021-4fc4-48c9-a990-e80156408db2`
- Profile: `ae1cab7c-0877-4243-aee7-e13aeec83da0`
- Explore: `f0d3ab0f-3c11-43d1-942a-0b0d8ccf0dd1`

### Global chrome

- Full-width dark header ~64px: mark + wordmark "GitHub" left; "Search or jump to..." input; text links Pull requests, Issues, Marketplace, Explore; bell; + create menu; avatar.
- Sticky. Search focuses a command palette (shadcn Command) listing repos and jumping to `owner/repo`.
- Footer: GitHub mark, Terms, Privacy, Security, Status, Docs, Contact, Pricing, API.

### Home (`/`) — logged-in dashboard

GitHub home is NOT a stats-card SaaS dashboard. Layout:

- Left column (~280px): user identity, "Top repositories" list with search, "Recent activity".
- Main: "Home" feed of activity (starred, pushed, opened PR/issue) plus "Trending repositories".
- Right (optional lg+): "Explore" / recommended repos.

Do not use a 3-stat-card row as the hero.

### Repository page (`/{owner}/{repo}`)

Exact GitHub stack:

1. Repo header: `owner / name` (owner links to profile), visibility pill (Public/Private), Watch · Fork (count) · Star (count, filled when starred). If fork, "forked from owner/repo".
2. Underline tab bar: Code (active), Issues (count), Pull requests (count), Actions (disabled/soon), Projects, Security, Insights. Use shadcn Tabs visually but these are real Next.js links.
3. Branch control: git-branch icon + `main` dropdown + N branches · N tags. "Go to file". Green "Code" dropdown with clone URL `https://github.local/{owner}/{repo}.git` and "Download ZIP" (no-op toast).
4. File table in a bordered card:
   - Header row: latest commit author avatar + message + short SHA + relative time + commit count link.
   - Rows: folder/file icon, name, latest commit message, relative time. Directories first, then files, localeCompare.
5. README.md rendered below the file table (headings, lists, code fences, links). Simple markdown renderer is enough (no need for a heavy lib if a small one is already available; `pnpm add react-markdown` is fine).
6. Right About sidebar (~300px, hidden below xl): description, website, topics as pills, README / License links, star/watch/fork counts, Releases, Contributors avatars, Languages bar + legend.

### Blob (`/{owner}/{repo}/blob/{ref}/{...path}`)

Breadcrumb `ref / dir / file`. Latest commit strip. Line-numbered monospace viewer, Raw / Copy / History. Syntax coloring optional; line numbers required.

### Tree (`/{owner}/{repo}/tree/{ref}/{...path}`)

Same file table as repo root, at that tree.

### Commits (`/{owner}/{repo}/commits/{ref}`)

Grouped by day. Each row: message, author avatar, short SHA, relative time. Click → commit.

### Commit (`/{owner}/{repo}/commit/{sha}`)

Commit header (message, author, date, parent SHAs). Stats: N files, +adds / −dels. Then per-file unified or split diffs.

### Issues list (`/{owner}/{repo}/issues`)

- Query bar default `is:open`. Labels, Milestones. Green "New issue".
- Open/Closed counts as toggles.
- Rows: open/closed icon, **title**, label pills, `#n opened {rel} by {login}`, assignee avatars, comment count.
- Author / Label / Sort dropdowns (functional filter).

### Issue detail (`/{owner}/{repo}/issues/{n}`)

Title + `#n`. Open/Closed badge. Author opened {rel}. Timeline of body + comments. Comment composer. Right: Assignees, Labels, Milestone. Owner can Close/Reopen.

### Pull requests list — same skeleton as issues, purple merged icon when merged.

### PR conversation (`/{owner}/{repo}/pull/{n}`)

- Title, Open/Merged/Closed badge.
- `head` ← `base` branch chips, commit count, file count, +/−.
- Tabs: Conversation · Commits · Files changed.
- Timeline + merge box:
  - If mergeable (head is descendant of base or 3-way merge possible): green "Merge pull request" → confirm → creates merge commit via Git engine push (pack + ref transaction on `base`) → PR merged, base ref updated, issue-like state `merged`.
  - If already merged: "Pull request successfully merged" with merged SHA.
- Review comment composer.

### PR files (`/{owner}/{repo}/pull/{n}/files`)

Left file tree of changed files. Main: split diff, deletions `#ffebe9`, additions `#dafbe1`. Review changes button.

### Profile (`/{owner}`)

Two column: left avatar, name, login, Follow (toggle), bio, location, followers/following. Tabs: Overview, Repositories, Stars. Overview: pinned repo cards, contribution heatmap (52×7), contribution activity timeline. Repositories tab: searchable list of that owner's repos.

### Create repository (`/new`)

Form: Owner (current user), Repository name (slug validate), Description, Public/Private radios, "Add a README file" checkbox. Green "Create repository". On submit: `git init` in engine, optional initial commit of README via pack+ref txn to `refs/heads/main`, then navigate to the new repo.

### Search (`/search?q=`)

Tabs Repositories / Issues / Pull requests / Users. Filter seeded data.

### Notifications (`/notifications`)

List of unread events (starred, issue comment, PR review). Mark as read.

---

## Git engine (from the blog)

Implement under `lib/git/`. Pure TypeScript. No React.

### Why this shape

The blog's load-bearing facts:

- Git is a DAG. You cannot cheaply shard objects into a DHT because every walk is pointer-chasing (commit → tree → subtree → blob; commit → parent).
- Packfiles are the unit of **storage and network**. A push is a packfile plus a **reference transaction**.
- A pushed object is **not reachable** until the ref that points at it is updated.
- Git clients cannot tolerate eventual consistency. Pushes must be **linearizable**.
- Local on-disk Git (here: an in-memory Git repo materialized from a WAL) is the execution engine. The WAL is the source of truth.
- Compaction: many packfiles make object lookup O(packs). Periodic repack.

### Objects

```
type GitObjectType = "blob" | "tree" | "commit"

Blob: raw file bytes (utf-8 string for MVP)
Tree: sorted entries { mode: "100644" | "040000" | "100755", name, sha }
Commit: { tree, parents: sha[], author: Ident, committer: Ident, message }
Ident: { name, email, timestamp, tz }
```

SHA-1 hex of `type SP size NUL content` (Git object header). Use Node `crypto` / Web Crypto. Export `hashObject(type, payload): sha`.

Tree serialization: Git-compatible `mode SP name NUL sha-bytes` concatenation, then hashed as a tree object.

### Packfiles

```
type PackObject =
  | { kind: "full"; type; payload }
  | { kind: "delta"; baseSha; payload }  // optional; MVP may store full objects only

type Packfile = {
  id: string
  objects: { type; sha; payload }[]
}
```

Receiving a pack **stores objects** but does **not** publish them.

### Refs and transactions

Refs: `refs/heads/*`, `refs/tags/*`, `HEAD` → symbolic `ref: refs/heads/main`.

A Git push:

1. Store packfile (objects now in object db, still unreachable if no ref points to them).
2. **Reference transaction**:
   - PREPARE: lock each ref, verify `expectedOldSha` (null for create).
   - COMMIT: update refs atomically.
   - ABORT: drop the lock, leave refs unchanged. Pack objects may remain as dangling.

Unreachable objects must **not** appear in `log`, `ls-tree` of a branch, or the file browser.

Non-fast-forward: reject unless `force: true`. Fast-forward = new tip has old tip as ancestor (DAG walk).

### WAL (Continuity-inspired, MVP)

```
type WalEntry =
  | { type: "push"; packId; refUpdates: { name; oldSha; newSha }[]; timestamp }
  | { type: "compaction"; packIds; timestamp }

type WalIndex = { headEntryId: string | null; etag: number }
```

Rules:

- Never acknowledge a push until the pack is persisted **and** the WAL index CAS succeeds.
- Publishing is the index pointer, not the pack upload. This linearizes pushes.
- Local repo is a **cache**: `materialize(repoId)` replays WAL entries in order onto an object db + refs.
- CAS: `compareAndSwapIndex(expectedEtag, next)` — concurrent push retries or fails.

For the browser/server MVP, persist the whole platform snapshot in `globalThis` (or a module singleton) plus `localStorage` so reloads keep data. WAL is still the write path; do not mutate refs except through `commitRefTransaction`.

### Repo store API

```
createRepository({ owner, name, visibility, description }) // empty, HEAD → main (unborn)
push(repoId, { pack, refUpdates, force? }) // WAL + txn
fetchReachable(repoId, ref) // objects reachable from ref
lsTree(repoId, ref, path)
catFile(repoId, sha)
log(repoId, ref, { max? })
diffTrees(repoId, oldSha, newSha) // file patches for PRs
merge(repoId, { oursRef, theirsSha, author, message }) // merge commit + push to oursRef
fork(repoId, { newOwner, newName }) // copy object db + refs + WAL snapshot, set parent
compact(repoId) // rebuild a single pack of reachable objects, append compaction WAL entry
```

`lsTree` / `log` **walk the DAG** from the ref's commit. Never list objects by scanning the object db.

### Merge

- If theirs is FF of ours: update ref to theirs (still via pack+txn; pack may be empty).
- Else: build merged tree (recursive, conflict → fail mergeable=false), create merge commit with two parents, push.

### Tests (`lib/git/git.test.ts`)

Run with `pnpm exec tsx --test lib/git/git.test.ts` (add `tsx` devDependency).

Must cover:

1. Blob/tree/commit hashing is stable; trees with same entries hash equal.
2. Push pack then **omit** ref update → `log(main)` does not show the commit.
3. Push pack + ref txn → commit is the tip of main; `lsTree` shows files.
4. Non-FF push rejected; force succeeds.
5. Concurrent CAS: second push with stale etag fails; retry with new etag succeeds.
6. Fork copies history; pushing to fork does not change upstream refs.
7. Merge FF and non-FF (two files on two branches).
8. Compaction preserves `log` and `lsTree`.
9. Dangling objects after aborted txn are not reachable.

---

## GitHub business logic (`lib/platform/`)

Wrap the Git engine. This is GitHub's product, not just Git.

### Entities

- **User**: login, name, avatarInitials, bio, company, location, website, followers[], following[], createdAt. Current session user is `octocat`.
- **Org**: same identity shape, `type: "org"`, members[].
- **Repository**: id, ownerLogin, name, description, visibility, defaultBranch, parent (fork), topics[], license, website, createdAt, pushedAt. Git repoId = `{owner}/{name}`.
- **Star / Watch**: unique (user, repo).
- **Issue**: repo, number (monotonic per repo), title, body, state `open|closed`, author, assignees[], labels[], comments[], createdAt, closedAt.
- **Label**: name, color, description.
- **PullRequest**: extends issue fields + `head: { owner, repo, ref, sha }`, `base: { ref, sha }`, `merged`, `mergedAt`, `mergedBy`, `mergeCommitSha`. Numbers share the issue counter (GitHub does this).
- **Comment**: author, body, createdAt.
- **Notification**: user, unread, reason, subject (issue/PR/repo), createdAt.
- **Activity event**: actor, verb (pushed, opened, starred, forked, merged, commented), repo, at.

### Rules

- Creating a repo: unique `(owner, name)` slug `^[a-zA-Z0-9._-]+$`; initializes Git repo; optional README commit.
- Star toggles; star count = distinct users.
- Fork: Git `fork()` + social parent pointer; cannot fork your own repo twice into the same name.
- Issues: anyone can open; author/owner can close/reopen/comment.
- PRs: `head` and `base` must exist; files changed = `diffTrees(base.sha, head.sha)` at open time **and** recomputed live from current SHAs.
- Merge: only if not merged and Git merge succeeds; then close as merged, notify, activity.
- Search: substring on repo name/description, issue title, user login.
- Contribution heatmap: count commits by author login per day from all reachable commits on default branches of repos they own or committed to.

### Seed (build via Git APIs, never hand-write SHAs)

Users: `octocat` (session), `gaearon`, `torvalds`, `hubot`. Orgs: `facebook`, `vercel`.

Repos (with real trees, 3–8 commits, 2 branches each where useful):

1. `facebook/react` — public, TS/JS files, README, LICENSE MIT, topics react,ui. Issues + 2 PRs (one open, one merged). Many stars.
2. `vercel/next.js` — public, similar.
3. `octocat/hello-world` — README-only, owned by session user.
4. `octocat/spokes` — a small "git hosting" repo whose README quotes packfile + ref-transaction ideas (ties the blog into the product). Branch `wal-index` with an extra commit for an open PR into `main`.
5. `gaearon/redux` — forked-from story optional.

Each repo: at least one folder, several files, a README with headings, and commit history that the UI can show.

Labels on facebook/react: bug, enhancement, question, documentation.

Notifications and activity feed populated from seed events.

---

## App structure

```
app/
  layout.tsx          # AppHeader + children + Footer, StoreProvider
  page.tsx            # dashboard
  globals.css
  new/page.tsx
  search/page.tsx
  issues/page.tsx     # global issues for current user
  pulls/page.tsx
  notifications/page.tsx
  [owner]/page.tsx
  [owner]/[repo]/page.tsx
  [owner]/[repo]/tree/[...path]/page.tsx
  [owner]/[repo]/blob/[...path]/page.tsx
  [owner]/[repo]/commits/[[...ref]]/page.tsx
  [owner]/[repo]/commit/[sha]/page.tsx
  [owner]/[repo]/issues/page.tsx
  [owner]/[repo]/issues/new/page.tsx
  [owner]/[repo]/issues/[number]/page.tsx
  [owner]/[repo]/pulls/page.tsx
  [owner]/[repo]/pull/[number]/page.tsx
  [owner]/[repo]/pull/[number]/files/page.tsx
lib/git/              # engine + tests
lib/platform/         # store, seed, queries, mutations
components/github/    # Header, Footer, RepoHeader, FileTable, DiffView, IssueRow, Markdown, Heatmap, CloneMenu
components/ui/        # shadcn only
```

`[owner]` and reserved routes: put `new`, `search`, `issues`, `pulls`, `notifications` as static routes so they win over `[owner]`.

Use `'use client'` where the store is reactive. A `StoreProvider` at the root that holds the platform singleton and `useSyncExternalStore` is the intended pattern.

Relative times: implement a tiny `timeAgo`.

## shadcn components to add

`card`, `dropdown-menu`, `dialog`, `checkbox`, `select`, `textarea`, `breadcrumb`, `sheet`, `popover`, `label`, `scroll-area`, `command`, `separator` (exists), `hover-card`, `skeleton`.

## Copy / branding

Product name: **GitHub**. Wordmark next to a simple mark (lucide `Github` icon is acceptable). Title in `layout.tsx`: "GitHub". Remove Northstar, v0 generator noise from metadata if easy.

Empty states: GitHub-style sentences ("There aren't any open issues." / "octocat doesn't have any starred repositories yet.").

## Done when

- `pnpm exec tsx --test lib/git/git.test.ts` passes.
- `pnpm build` succeeds.
- Visiting `/` looks like GitHub home, not Northstar.
- `facebook/react` file browser, README, issues, at least one PR with a real diff, merge updates `main` via WAL.
- Star/fork/create-repo/create-issue work without reload loss (localStorage).
- Default shadcn tokens are in `:root`.
- No leftover Northstar copy.
