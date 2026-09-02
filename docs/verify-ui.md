# UI verification

Workspace: `/home/jack/workspace/github-clone`  
Date: 2026-09-02  
Scope: GitHub-clone UI vs `docs/mvp-spec.md`. Production code was not edited.

| Field | Value |
|-------|-------|
| **ready** | **yes** |
| **missing routes** | **none** |
| **leftover Northstar** | **none in product UI** (only mentioned in the spec). README still has v0 generator copy. |
| **blockers** | **none** |

Star, fork, create repository, merge, and issue comment all call the platform store. There is no `flash()` and no mutation no-op on those actions.

---

## Routes

Required routes exist under `app/` as Next.js App Router pages. `/` is a GitHub home feed, not a Northstar stats-card dashboard. Static reserved routes (`new`, `search`, `issues`, `pulls`, `notifications`) sit beside `[owner]`, so they win over the profile catch-all.

| Route | File | Status |
|-------|------|--------|
| `/` | `app/page.tsx` | present — left “Top repositories”, Home activity feed, Trending, Explore. No 3-stat-card hero. |
| `/new` | `app/new/page.tsx` | present |
| `/search` | `app/search/page.tsx` | present |
| `/issues` | `app/issues/page.tsx` | present |
| `/pulls` | `app/pulls/page.tsx` | present |
| `/notifications` | `app/notifications/page.tsx` | present |
| `/[owner]` | `app/[owner]/page.tsx` | present |
| `/[owner]/[repo]` | `app/[owner]/[repo]/page.tsx` | present |
| tree | `app/[owner]/[repo]/tree/[...path]/page.tsx` | present (`/{owner}/{repo}/tree/{ref}/{...path}`) |
| blob | `app/[owner]/[repo]/blob/[...path]/page.tsx` | present |
| commits | `app/[owner]/[repo]/commits/[[...ref]]/page.tsx` | present |
| commit | `app/[owner]/[repo]/commit/[sha]/page.tsx` | present |
| issues | `app/[owner]/[repo]/issues/page.tsx` | present |
| issue-detail | `app/[owner]/[repo]/issues/[number]/page.tsx` | present |
| pulls | `app/[owner]/[repo]/pulls/page.tsx` | present |
| pull | `app/[owner]/[repo]/pull/[number]/page.tsx` | present |
| pull/files | `app/[owner]/[repo]/pull/[number]/files/page.tsx` | present |

Extra (not in the required list, also present):

- `app/[owner]/[repo]/issues/new/page.tsx`
- `app/[owner]/[repo]/pull/[number]/commits/page.tsx`

`pnpm build` route table in `docs/verify-build.md` matches this list.

---

## Header

`components/github/header.tsx` is GitHub-like:

- Sticky full-width bar, `h-16`, `bg-foreground text-background` (near-black on light canvas).
- Mark + “GitHub” wordmark.
- “Search or jump to...” control; `/` and `⌘K` open shadcn `CommandDialog` listing repos and jumping to `owner/repo`.
- Text links: **Pull requests** (`/pulls`), **Issues** (`/issues`), Marketplace (label only), Explore (`/search`).
- Bell → `/notifications`, `+` create menu, avatar menu.

Mounted from `app/layout.tsx` with `StoreProvider` + `AppFooter`. Document title is `"GitHub"`.

---

## Theme tokens

`app/globals.css` `:root` and `.dark` match the spec’s default shadcn neutral tokens.

- `--primary: oklch(0.205 0 0)` (near-black, **not** a Northstar blue primary).
- Light is the default canvas. No `prefers-color-scheme: dark` override copying dark tokens onto `:root`.
- GitHub semantics are additive utilities only: `.gh-open`, `.gh-closed`, `.gh-merged`, `.gh-add-bg`, `.gh-del-bg`, language dots.

Green CTAs use `bg-emerald-600 text-white hover:bg-emerald-700` as the spec allows.

---

## shadcn primitives

Product chrome imports from `components/ui/`:

- Used: `Button`, `Input`, `Textarea`, `Checkbox`, `Label`, `Dialog`, `DropdownMenu`, `Command`, `Avatar`, `Badge`, `ScrollArea`.
- Installed but unused in pages: `Tabs`, `Card`, `Select`, `Popover`, `Sheet`, `Skeleton`, `HoverCard`, `Breadcrumb`.

Repo / profile / search / PR tab bars are custom `UnderlineNav` (Next.js `Link`s with an underline), not `components/ui/tabs`. Spec asked to use shadcn Tabs *visually* while keeping real links. That is a deviation, not a missing route and not a mutation blocker.

Other non-blocking primitive slips:

- `/new` visibility uses native `<input type="radio">`.
- New-issue labels use native checkboxes.
- `ReviewChangesButton` uses a native `<textarea>` and a hand-rolled popover instead of `Textarea` / `Popover`.
- Several CTAs (“New”, “New issue”) are styled `<Link>`s, not `Button`.

These do not restore a custom button/input primitive set. Interactive chrome still goes through shadcn for the main actions.

---

## Mutations (store, not flash)

No `flash()` anywhere in `app/` or `components/`. Required actions write the platform singleton (`lib/platform/store.ts`) and persist via `localStorage` (`github-clone:v1`).

| Action | UI | Store |
|--------|----|-------|
| Star | `components/github/star-button.tsx` → `toggleStar(repoId)` | toggles `state.stars`, activity, `emit()` |
| Fork | `components/github/repo-header.tsx` → `forkRepo(repo.id)` | Git `fork()` + parent pointer, navigate to new repo |
| Create repo | `app/new/page.tsx` → `createRepo({ owner, name, description, visibility, autoInit })` | `git.createRepository` + optional README commit, navigate |
| Create issue | `app/[owner]/[repo]/issues/new/page.tsx` → `createIssue(...)` | monotonic number, activity, notify |
| Merge | `components/github/merge-box.tsx` → `mergePull(repo.id, pull.number)` | Git merge pack + ref txn on base, PR `merged` |
| Issue / PR comment | `components/github/comment-thread.tsx` → `addIssueComment(...)`; PR files `ReviewChangesButton` also calls `addIssueComment` | comments, activity, notify |

Allowed no-op: Clone menu “Download ZIP” shows a local toast (“ZIP download isn’t available in this clone.”), as the spec permits.

---

## Leftover Northstar

Grep of `*.tsx` / `*.ts` / `*.css` / `*.json` for `Northstar`, `northstar`, dashboard shells, and a blue primary palette: **no hits** outside `docs/mvp-spec.md`.

`/` is not a SaaS stats dashboard. Header, repo header, file table, issues, PR files split diff, and profile heatmap are GitHub product layouts.

Residual generator noise (not Northstar, not a UI blocker):

- `README.md` still says the project is bootstrapped with v0 and links `v0.app`.
- `package.json` `"name": "my-project"`.

---

## Blockers

**None** for this UI check.

Non-blocking notes only: unused `Tabs` (custom `UnderlineNav` instead), leftover v0 README copy, a few native form controls, header “New gist” routing to `/new`.
