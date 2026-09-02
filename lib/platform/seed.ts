import type { GitStore, Ident } from "@/lib/git"
import type {
  ActivityEvent,
  Issue,
  Label,
  Notification,
  Org,
  PlatformState,
  PullRequest,
  Repository,
  Star,
  User,
  Watch,
} from "./types"

const SESSION = "octocat"

function ident(login: string, name: string, iso: string): Ident {
  return {
    name,
    email: `${login}@users.noreply.github.local`,
    timestamp: Math.floor(Date.parse(iso) / 1000),
    tz: "+0000",
  }
}

function commit(
  git: GitStore,
  repoId: string,
  files: Record<string, string>,
  message: string,
  who: Ident,
  ref?: string,
) {
  const target = ref ?? "refs/heads/main"
  const current = git.resolveRef(repoId, target)
  const main = git.resolveRef(repoId, "main")
  const parents = current ? [current] : main ? [main] : []
  return git.commitFiles(repoId, { files, message, author: who, ref: target, parents })
}

export function seedPlatform(git: GitStore): PlatformState {
  const users: User[] = [
    {
      type: "user",
      login: "octocat",
      name: "The Octocat",
      avatarInitials: "OC",
      bio: "GitHub's friendly mascot. Building the social layer on top of Git.",
      company: "GitHub",
      location: "San Francisco",
      website: "https://github.blog",
      followers: ["gaearon", "hubot"],
      following: ["gaearon", "torvalds"],
      createdAt: "2011-01-25T00:00:00.000Z",
    },
    {
      type: "user",
      login: "gaearon",
      name: "Dan Abramov",
      avatarInitials: "DA",
      bio: "Working on React. Previously Redux, Create React App, React Hot Loader.",
      company: "Bluesky",
      location: "London",
      website: "https://overreacted.io",
      followers: ["octocat", "hubot"],
      following: ["octocat", "torvalds"],
      createdAt: "2012-09-14T00:00:00.000Z",
    },
    {
      type: "user",
      login: "torvalds",
      name: "Linus Torvalds",
      avatarInitials: "LT",
      bio: "Creator of Linux and Git.",
      company: "Linux Foundation",
      location: "Portland, OR",
      website: "https://kernel.org",
      followers: ["octocat", "gaearon", "hubot"],
      following: [],
      createdAt: "2011-09-03T00:00:00.000Z",
    },
    {
      type: "user",
      login: "hubot",
      name: "Hubot",
      avatarInitials: "HB",
      bio: "A customizable life embetterment robot.",
      company: "GitHub",
      location: "The Internet",
      website: "https://hubot.github.com",
      followers: [],
      following: ["octocat", "gaearon", "torvalds"],
      createdAt: "2011-10-25T00:00:00.000Z",
    },
  ]

  const orgs: Org[] = [
    {
      type: "org",
      login: "facebook",
      name: "Meta",
      avatarInitials: "F",
      bio: "We are working to build community through open source technology.",
      company: "Meta",
      location: "Menlo Park, California",
      website: "https://opensource.fb.com",
      members: ["gaearon"],
      createdAt: "2009-04-02T00:00:00.000Z",
    },
    {
      type: "org",
      login: "vercel",
      name: "Vercel",
      avatarInitials: "▲",
      bio: "Develop. Preview. Ship.",
      company: "Vercel",
      location: "San Francisco",
      website: "https://vercel.com",
      members: ["gaearon", "hubot"],
      createdAt: "2015-11-01T00:00:00.000Z",
    },
  ]

  const repos: Repository[] = []
  const stars: Star[] = []
  const watches: Watch[] = []
  const labels: Label[] = []
  const issues: Issue[] = []
  const pullRequests: PullRequest[] = []
  const notifications: Notification[] = []
  const activity: ActivityEvent[] = []
  const issueCounters: Record<string, number> = {}
  let n = 1
  const id = (prefix: string) => `${prefix}_${n++}`

  const octocat = ident("octocat", "The Octocat", "2024-01-01T00:00:00.000Z")
  const gaearon = ident("gaearon", "Dan Abramov", "2024-01-01T00:00:00.000Z")
  const hubot = ident("hubot", "Hubot", "2024-01-01T00:00:00.000Z")

  function addRepo(repo: Repository) {
    git.createRepository({
      owner: repo.ownerLogin,
      name: repo.name,
      visibility: repo.visibility,
      description: repo.description,
    })
    repos.push(repo)
    issueCounters[repo.id] = 0
  }

  function pushActivity(event: Omit<ActivityEvent, "id">) {
    activity.push({ id: id("act"), ...event })
  }

  function notify(user: string, reason: string, subject: Notification["subject"], createdAt: string) {
    notifications.push({
      id: id("n"),
      user,
      unread: true,
      reason,
      subject,
      createdAt,
    })
  }

  // --- facebook/react ---
  const reactId = "facebook/react"
  addRepo({
    id: reactId,
    ownerLogin: "facebook",
    name: "react",
    description: "The library for web and native user interfaces.",
    visibility: "public",
    defaultBranch: "main",
    parent: null,
    topics: ["react", "ui", "javascript", "frontend"],
    license: "MIT",
    website: "https://react.dev",
    createdAt: "2013-05-24T16:15:00.000Z",
    pushedAt: "2026-08-20T18:00:00.000Z",
  })

  const reactFiles1 = {
    "README.md": `# React

The library for web and native user interfaces.

## Getting started

\`\`\`bash
npm install react
\`\`\`

\`\`\`js
import { createElement, useState } from "react";
\`\`\`

## Documentation

See [react.dev](https://react.dev) for guides, API reference, and the blog.
`,
    LICENSE: `MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.
`,
    "package.json": `{
  "name": "react",
  "version": "19.1.0",
  "license": "MIT",
  "main": "src/index.ts"
}
`,
    "src/index.ts": `export { createElement, useState, useEffect } from "./React";
export { render } from "../packages/react-dom/index";
`,
    "src/React.ts": `export function createElement(type: string | Function, props: Record<string, unknown> | null, ...children: unknown[]) {
  return { type, props: { ...(props ?? {}), children } };
}

export function useState<T>(initial: T): [T, (value: T) => void] {
  return [initial, () => {}];
}

export function useEffect(_fn: () => void, _deps?: unknown[]) {}
`,
    "packages/react-dom/index.ts": `export function render(_element: unknown, _container: unknown) {
  return null;
}
`,
  }
  commit(
    git,
    reactId,
    reactFiles1,
    "Initial public API: createElement and renderer",
    { ...gaearon, timestamp: Math.floor(Date.parse("2024-02-12T10:00:00.000Z") / 1000) },
  )

  const reactFiles2 = {
    ...reactFiles1,
    "src/hooks.ts": `export function useMemo<T>(factory: () => T, _deps: unknown[]): T {
  return factory();
}

export function useCallback<T extends Function>(fn: T, _deps: unknown[]): T {
  return fn;
}
`,
    "src/index.ts": `export { createElement, useState, useEffect } from "./React";
export { useMemo, useCallback } from "./hooks";
export { render } from "../packages/react-dom/index";
`,
  }
  const reactC2 = commit(
    git,
    reactId,
    reactFiles2,
    "Add useMemo and useCallback",
    { ...gaearon, timestamp: Math.floor(Date.parse("2025-06-03T15:22:00.000Z") / 1000) },
  )

  const reactFiles3 = {
    ...reactFiles2,
    "README.md": `# React

The library for web and native user interfaces.

## Getting started

\`\`\`bash
npm install react
\`\`\`

## Hooks

- \`useState\`
- \`useEffect\`
- \`useMemo\`
- \`useCallback\`

## Documentation

See [react.dev](https://react.dev) for guides, API reference, and the blog.
`,
    "docs/hooks.md": `# Hooks

Hooks let you use state and other React features without writing a class.
`,
  }
  commit(
    git,
    reactId,
    reactFiles3,
    "Document hooks in the README",
    { ...gaearon, timestamp: Math.floor(Date.parse("2026-03-18T09:40:00.000Z") / 1000) },
  )

  const reactDocs = {
    ...reactFiles3,
    "README.md": reactFiles3["README.md"] + "\nThanks to everyone who files issues.\n",
  }
  const docsBranch = commit(
    git,
    reactId,
    reactDocs,
    "Fix README gratitude line",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-04-02T12:00:00.000Z") / 1000) },
    "refs/heads/fix-readme",
  )

  labels.push(
    { repoId: reactId, name: "bug", color: "d73a4a", description: "Something isn't working" },
    { repoId: reactId, name: "enhancement", color: "a2eeef", description: "New feature or request" },
    { repoId: reactId, name: "question", color: "d876e3", description: "Further information is requested" },
    { repoId: reactId, name: "documentation", color: "0075ca", description: "Improvements or additions to documentation" },
  )

  issues.push({
    id: id("issue"),
    repoId: reactId,
    number: 1,
    title: "useState updater sees stale props in concurrent render",
    body: "When rendering with a deferred value, the updater function sometimes closes over the previous props.\n\n### Reproduction\n1. Open the concurrent demo\n2. Type quickly in the input\n",
    state: "open",
    author: "hubot",
    assignees: ["gaearon"],
    labels: ["bug"],
    comments: [
      {
        id: id("cmt"),
        author: "gaearon",
        body: "Thanks — I think this is the same family of issues as the bailout on stale lanes. I'll take a look.",
        createdAt: "2026-07-12T11:00:00.000Z",
      },
    ],
    createdAt: "2026-07-11T08:15:00.000Z",
    closedAt: null,
  })
  issues.push({
    id: id("issue"),
    repoId: reactId,
    number: 2,
    title: "How should libraries opt into the compiler?",
    body: "Is there a recommended `use memo` directive, or should this be a bundler plugin only?",
    state: "open",
    author: "octocat",
    assignees: [],
    labels: ["question", "enhancement"],
    comments: [],
    createdAt: "2026-07-20T14:22:00.000Z",
    closedAt: null,
  })
  issues.push({
    id: id("issue"),
    repoId: reactId,
    number: 3,
    title: "Docs: mention React Compiler in the hooks guide",
    body: "The hooks guide still reads like memoization is always manual.",
    state: "closed",
    author: "hubot",
    assignees: ["gaearon"],
    labels: ["documentation"],
    comments: [
      {
        id: id("cmt"),
        author: "gaearon",
        body: "Fixed on main via the README update. Closing.",
        createdAt: "2026-03-19T10:00:00.000Z",
      },
    ],
    createdAt: "2026-03-17T09:00:00.000Z",
    closedAt: "2026-03-19T10:00:00.000Z",
  })

  const mergedPr: PullRequest = {
    id: id("pr"),
    repoId: reactId,
    number: 4,
    title: "Fix README gratitude line",
    body: "Tiny copy edit so the README thanks people who file issues.",
    state: "closed",
    author: "octocat",
    assignees: [],
    labels: ["documentation"],
    comments: [],
    createdAt: "2026-04-02T12:05:00.000Z",
    closedAt: "2026-04-02T15:00:00.000Z",
    head: { owner: "facebook", repo: "react", ref: "fix-readme", sha: docsBranch.commitSha },
    base: { ref: "main", sha: reactC2.commitSha },
    merged: true,
    mergedAt: "2026-04-02T15:00:00.000Z",
    mergedBy: "gaearon",
    mergeCommitSha: null,
  }
  const mergeIdent = ident("gaearon", "Dan Abramov", "2026-04-02T15:00:00.000Z")
  const mergeResult = git.merge(reactId, {
    oursRef: "refs/heads/main",
    theirsSha: docsBranch.commitSha,
    author: mergeIdent,
    message: "Merge pull request #4 from facebook/fix-readme",
  })
  if (mergeResult.mergeable) mergedPr.mergeCommitSha = mergeResult.sha
  pullRequests.push(mergedPr)

  const mainAfterMerge = git.readFiles(reactId, "main")
  const reactCompiler = {
    ...mainAfterMerge,
    "compiler/README.md": `# React Compiler

An optimizing compiler for React. Still experimental.

The compiler infers memoization so you do not have to sprinkle useMemo by hand.
`,
    "src/compiler.ts": `export function compile(source: string): string {
  return source;
}
`,
  }
  const compilerBranch = commit(
    git,
    reactId,
    reactCompiler,
    "Sketch the React Compiler package",
    { ...gaearon, timestamp: Math.floor(Date.parse("2026-07-01T16:00:00.000Z") / 1000) },
    "refs/heads/compiler",
  )

  pullRequests.push({
    id: id("pr"),
    repoId: reactId,
    number: 5,
    title: "Sketch the React Compiler package",
    body: "Adds a `compiler/` folder and a stub `compile()` so we can start landing fixtures.\n\nStill experimental — not wired into the bundler yet.",
    state: "open",
    author: "gaearon",
    assignees: [],
    labels: ["enhancement"],
    comments: [
      {
        id: id("cmt"),
        author: "octocat",
        body: "Love this. Can we keep the stub in `src/` so the package graph stays obvious?",
        createdAt: "2026-07-02T09:10:00.000Z",
      },
    ],
    createdAt: "2026-07-01T16:10:00.000Z",
    closedAt: null,
    head: { owner: "facebook", repo: "react", ref: "compiler", sha: compilerBranch.commitSha },
    base: { ref: "main", sha: git.resolveRef(reactId, "main") ?? reactC2.commitSha },
    merged: false,
    mergedAt: null,
    mergedBy: null,
    mergeCommitSha: null,
  })
  issueCounters[reactId] = 5

  for (const user of ["octocat", "gaearon", "torvalds", "hubot"]) {
    stars.push({ user, repoId: reactId })
    watches.push({ user, repoId: reactId })
  }
  pushActivity({
    actor: "gaearon",
    verb: "pushed",
    repoId: reactId,
    at: "2026-03-18T09:40:00.000Z",
    message: "Document hooks in the README",
  })
  pushActivity({
    actor: "gaearon",
    verb: "merged",
    repoId: reactId,
    at: "2026-04-02T15:00:00.000Z",
    number: 4,
    message: "Fix README gratitude line",
  })
  pushActivity({
    actor: "gaearon",
    verb: "opened",
    repoId: reactId,
    at: "2026-07-01T16:10:00.000Z",
    number: 5,
    message: "Sketch the React Compiler package",
  })
  notify("octocat", "review requested", {
    type: "pull",
    repoId: reactId,
    number: 5,
    title: "Sketch the React Compiler package",
  }, "2026-07-01T16:12:00.000Z")
  notify("gaearon", "comment", {
    type: "issue",
    repoId: reactId,
    number: 1,
    title: "useState updater sees stale props in concurrent render",
  }, "2026-07-11T08:16:00.000Z")

  // --- vercel/next.js ---
  const nextId = "vercel/next.js"
  addRepo({
    id: nextId,
    ownerLogin: "vercel",
    name: "next.js",
    description: "The React Framework.",
    visibility: "public",
    defaultBranch: "main",
    parent: null,
    topics: ["nextjs", "react", "framework", "ssr"],
    license: "MIT",
    website: "https://nextjs.org",
    createdAt: "2016-10-05T00:00:00.000Z",
    pushedAt: "2026-08-28T12:00:00.000Z",
  })
  const nextFiles1 = {
    "README.md": `# Next.js

The React Framework for the Web.

## Getting started

\`\`\`bash
npx create-next-app@latest
\`\`\`

## Features

- Server Components
- App Router
- Turbopack
`,
    LICENSE: "MIT License\n\nCopyright (c) Vercel, Inc.\n",
    "package.json": `{
  "name": "next",
  "version": "15.5.0",
  "license": "MIT"
}
`,
    "packages/next/index.ts": `export { default } from "./server";
`,
    "packages/next/server.ts": `export default function next(options: { dir?: string } = {}) {
  return { dir: options.dir ?? process.cwd?.() ?? "." };
}
`,
    "examples/blog/page.tsx": `export default function Page() {
  return <main><h1>Blog</h1></main>;
}
`,
  }
  commit(
    git,
    nextId,
    nextFiles1,
    "Bootstrap the Next.js monorepo",
    { ...hubot, timestamp: Math.floor(Date.parse("2024-05-01T12:00:00.000Z") / 1000) },
  )
  const nextFiles2 = {
    ...nextFiles1,
    "packages/next/app-router.ts": `export function createAppRouter() {
  return { kind: "app" as const };
}
`,
    "README.md": nextFiles1["README.md"] + "\nUsed in production by some of the largest sites on the web.\n",
  }
  commit(
    git,
    nextId,
    nextFiles2,
    "Introduce the App Router entry",
    { ...gaearon, timestamp: Math.floor(Date.parse("2025-11-11T08:00:00.000Z") / 1000) },
  )
  const nextFiles3 = {
    ...nextFiles2,
    "packages/next/turbopack.ts": `export function turbopackEnabled() {
  return true;
}
`,
  }
  commit(
    git,
    nextId,
    nextFiles3,
    "Enable Turbopack by default in examples",
    { ...hubot, timestamp: Math.floor(Date.parse("2026-08-28T12:00:00.000Z") / 1000) },
  )
  const nextCanary = {
    ...nextFiles3,
    "packages/next/canary.ts": `export const CANARY = true;

export function canaryLabel() {
  return "canary";
}
`,
  }
  commit(
    git,
    nextId,
    nextCanary,
    "Mark the canary release channel",
    { ...hubot, timestamp: Math.floor(Date.parse("2026-08-30T09:00:00.000Z") / 1000) },
    "refs/heads/canary",
  )
  issues.push({
    id: id("issue"),
    repoId: nextId,
    number: 1,
    title: "Document how to skip Turbopack in CI",
    body: "We need a one-liner for GitHub Actions.",
    state: "open",
    author: "octocat",
    assignees: [],
    labels: [],
    comments: [],
    createdAt: "2026-08-29T09:00:00.000Z",
    closedAt: null,
  })
  issueCounters[nextId] = 1
  stars.push({ user: "octocat", repoId: nextId }, { user: "gaearon", repoId: nextId }, { user: "hubot", repoId: nextId })
  watches.push({ user: "octocat", repoId: nextId })
  pushActivity({
    actor: "hubot",
    verb: "pushed",
    repoId: nextId,
    at: "2026-08-28T12:00:00.000Z",
    message: "Enable Turbopack by default in examples",
  })

  // --- octocat/hello-world ---
  const helloId = "octocat/hello-world"
  addRepo({
    id: helloId,
    ownerLogin: "octocat",
    name: "hello-world",
    description: "My first repository on GitHub.",
    visibility: "public",
    defaultBranch: "main",
    parent: null,
    topics: [],
    license: null,
    website: "",
    createdAt: "2024-01-10T00:00:00.000Z",
    pushedAt: "2026-01-15T00:00:00.000Z",
  })
  commit(
    git,
    helloId,
    {
      "README.md": `# Hello World\n\nThis is my first repository.\n`,
    },
    "Initial commit",
    { ...octocat, timestamp: Math.floor(Date.parse("2024-01-10T00:00:00.000Z") / 1000) },
  )
  commit(
    git,
    helloId,
    {
      "README.md": `# Hello World\n\nThis is my first repository on GitHub.\n`,
      "docs/getting-started.md": `# Getting started\n\nClone this repo and say hello.\n`,
    },
    "Add a getting started guide",
    { ...octocat, timestamp: Math.floor(Date.parse("2025-04-04T00:00:00.000Z") / 1000) },
  )
  commit(
    git,
    helloId,
    {
      "README.md": `# Hello World\n\nThis is my first repository on GitHub.\n\nHello from octocat.\n`,
      "docs/getting-started.md": `# Getting started\n\nClone this repo and say hello.\n`,
    },
    "Sign the README",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-01-15T00:00:00.000Z") / 1000) },
  )
  issueCounters[helloId] = 0
  pushActivity({
    actor: "octocat",
    verb: "pushed",
    repoId: helloId,
    at: "2026-01-15T00:00:00.000Z",
    message: "Sign the README",
  })

  // --- octocat/spokes ---
  const spokesId = "octocat/spokes"
  addRepo({
    id: spokesId,
    ownerLogin: "octocat",
    name: "spokes",
    description: "Git hosting notes: packfiles, reference transactions, and a linearizable WAL.",
    visibility: "public",
    defaultBranch: "main",
    parent: null,
    topics: ["git", "packfiles", "wal"],
    license: "MIT",
    website: "",
    createdAt: "2026-01-02T00:00:00.000Z",
    pushedAt: "2026-08-01T00:00:00.000Z",
  })
  const spokes1 = {
    "README.md": `# Spokes

Git hosting at any scale is a packfile plus a **reference transaction**.

A push has two parts:

1. Store the packfile. Objects now exist in the object database, but they are not reachable.
2. Prepare, then commit, a reference transaction. Only then does \`main\` (or any other ref) point at the new tip.

Until the ref that points at a commit is updated, that commit must not appear in \`git log\` or \`ls-tree\`. Git clients cannot tolerate eventual consistency — a push that is acknowledged has to be **linearizable**.

## Continuity

The source of truth is a write-ahead log. Local on-disk Git is a cache: \`materialize(repo)\` replays WAL entries onto an object database and refs. Publishing is the WAL index pointer, not the pack upload. Compare-and-swap on that index linearizes concurrent pushes.

Compaction rebuilds a single pack of reachable objects so lookup does not scan every packfile.
`,
    LICENSE: "MIT License\n\nCopyright (c) GitHub\n",
    "src/pack.ts": `export type PackObject = { type: "blob" | "tree" | "commit"; sha: string; payload: Uint8Array };

export type Packfile = {
  id: string;
  objects: PackObject[];
};

/** Receiving a pack stores objects but does not publish them. */
export function receivePack(_pack: Packfile) {}
`,
    "src/wal.ts": `export type WalIndex = { headEntryId: string | null; etag: number };

export function compareAndSwapIndex(expected: number, next: WalIndex, current: WalIndex) {
  if (current.etag !== expected) return false;
  return true;
}
`,
    "docs/continuity.md": `# Continuity

Never acknowledge a push until the pack is persisted and the WAL index CAS succeeds.
`,
  }
  commit(
    git,
    spokesId,
    spokes1,
    "Explain packfiles and reference transactions",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-01-02T12:00:00.000Z") / 1000) },
  )
  const spokes2 = {
    ...spokes1,
    "src/refs.ts": `export type RefTransaction = { name: string; oldSha: string | null; newSha: string };

export function prepare(txn: RefTransaction) {
  return { ...txn, locked: true };
}
`,
  }
  commit(
    git,
    spokesId,
    spokes2,
    "Add reference transaction prepare/commit/abort",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-03-01T12:00:00.000Z") / 1000) },
  )
  const spokes3 = {
    ...spokes2,
    "src/compact.ts": `export function compact(packIds: string[]) {
  return { type: "compaction", packIds };
}
`,
  }
  const spokesMain = commit(
    git,
    spokesId,
    spokes3,
    "Periodic compaction of reachable objects",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-06-01T12:00:00.000Z") / 1000) },
  )
  const spokesWal = {
    ...spokes3,
    "src/wal.ts": `export type WalIndex = { headEntryId: string | null; etag: number };

export function compareAndSwapIndex(expected: number, next: WalIndex, current: WalIndex) {
  if (current.etag !== expected) return false;
  current.headEntryId = next.headEntryId;
  current.etag = next.etag;
  return true;
}

/** Publishing is the index pointer, not the pack upload. */
export const INDEX_IS_THE_COMMIT_POINT = true;
`,
  }
  const walBranch = commit(
    git,
    spokesId,
    spokesWal,
    "CAS updates the WAL index in place",
    { ...octocat, timestamp: Math.floor(Date.parse("2026-08-01T12:00:00.000Z") / 1000) },
    "refs/heads/wal-index",
  )
  pullRequests.push({
    id: id("pr"),
    repoId: spokesId,
    number: 1,
    title: "Linearize pushes through the WAL index",
    body: "The index pointer is the commit point. Concurrent pushers retry when CAS fails on a stale etag.",
    state: "open",
    author: "octocat",
    assignees: [],
    labels: [],
    comments: [],
    createdAt: "2026-08-01T12:30:00.000Z",
    closedAt: null,
    head: { owner: "octocat", repo: "spokes", ref: "wal-index", sha: walBranch.commitSha },
    base: { ref: "main", sha: spokesMain.commitSha },
    merged: false,
    mergedAt: null,
    mergedBy: null,
    mergeCommitSha: null,
  })
  issueCounters[spokesId] = 1
  stars.push({ user: "gaearon", repoId: spokesId }, { user: "torvalds", repoId: spokesId })
  watches.push({ user: "octocat", repoId: spokesId })
  pushActivity({
    actor: "octocat",
    verb: "opened",
    repoId: spokesId,
    at: "2026-08-01T12:30:00.000Z",
    number: 1,
    message: "Linearize pushes through the WAL index",
  })
  notify("gaearon", "mention", {
    type: "pull",
    repoId: spokesId,
    number: 1,
    title: "Linearize pushes through the WAL index",
  }, "2026-08-01T12:31:00.000Z")

  // --- gaearon/redux ---
  const reduxId = "gaearon/redux"
  addRepo({
    id: reduxId,
    ownerLogin: "gaearon",
    name: "redux",
    description: "Predictable state container for JavaScript apps.",
    visibility: "public",
    defaultBranch: "main",
    parent: null,
    topics: ["redux", "javascript", "state"],
    license: "MIT",
    website: "https://redux.js.org",
    createdAt: "2015-06-02T00:00:00.000Z",
    pushedAt: "2025-12-01T00:00:00.000Z",
  })
  const redux1 = {
    "README.md": `# Redux\n\nA predictable state container for JavaScript apps.\n\n## Three principles\n\n1. Single source of truth\n2. State is read-only\n3. Changes are made with pure functions\n`,
    LICENSE: "MIT License\n\nCopyright (c) Dan Abramov\n",
    "src/createStore.ts": `export function createStore<S>(reducer: (state: S | undefined, action: { type: string }) => S) {
  let state = reducer(undefined, { type: "@@INIT" });
  return {
    getState: () => state,
    dispatch: (action: { type: string }) => {
      state = reducer(state, action);
      return action;
    },
  };
}
`,
    "src/index.ts": `export { createStore } from "./createStore";
`,
  }
  commit(
    git,
    reduxId,
    redux1,
    "createStore",
    { ...gaearon, timestamp: Math.floor(Date.parse("2024-06-02T00:00:00.000Z") / 1000) },
  )
  const redux2 = {
    ...redux1,
    "src/combineReducers.ts": `export function combineReducers<T extends Record<string, (state: never, action: { type: string }) => unknown>>(reducers: T) {
  return (state: Record<string, unknown> = {}, action: { type: string }) => {
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(reducers)) {
      next[key] = (reducers as Record<string, Function>)[key](state[key], action);
    }
    return next;
  };
}
`,
    "src/index.ts": `export { createStore } from "./createStore";
export { combineReducers } from "./combineReducers";
`,
  }
  commit(
    git,
    reduxId,
    redux2,
    "Add combineReducers",
    { ...gaearon, timestamp: Math.floor(Date.parse("2025-01-20T00:00:00.000Z") / 1000) },
  )
  const redux3 = {
    ...redux2,
    "docs/basics.md": `# Basics\n\nDispatch actions. Reducers return new state.\n`,
  }
  commit(
    git,
    reduxId,
    redux3,
    "Write the basics guide",
    { ...gaearon, timestamp: Math.floor(Date.parse("2025-12-01T00:00:00.000Z") / 1000) },
  )
  issueCounters[reduxId] = 0
  stars.push({ user: "octocat", repoId: reduxId }, { user: "hubot", repoId: reduxId })
  pushActivity({
    actor: "octocat",
    verb: "starred",
    repoId: reduxId,
    at: "2026-02-02T00:00:00.000Z",
  })

  return {
    users,
    orgs,
    repos,
    stars,
    watches,
    labels,
    issues,
    pullRequests,
    notifications,
    activity,
    issueCounters,
    sessionLogin: SESSION,
  }
}
