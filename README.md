# GitHub

An authentic GitHub clone: Git hosting plus GitHub’s social and collaboration product.

Git objects live in a content-addressable DAG. A push is a packfile plus a reference transaction, linearized through a write-ahead log. Unreachable objects stay unpublished until the ref that points at them commits.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You are signed in as **octocat**.

```bash
pnpm exec tsx --test lib/git/git.test.ts
pnpm build
```

## What’s included

- Repositories, file browser, blobs, commits, and diffs
- Issues, pull requests, merge (fast-forward and 3-way) via pack + WAL
- Stars, forks, notifications, search, and a contribution heatmap
- Seeded data for `facebook/react`, `vercel/next.js`, `octocat/hello-world`, `octocat/spokes`, and `gaearon/redux`
