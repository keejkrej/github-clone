import type { DiffHunk, DiffHunkLine, FileDiff } from "./types"

function lcsOps(a: string[], b: string[]): DiffHunkLine[] {
  const n = a.length
  const m = b.length
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? (dp[i - 1][j - 1] + 1) as unknown as number
          : (Math.max(dp[i - 1][j], dp[i][j - 1]) as unknown as number)
    }
  }
  const lines: DiffHunkLine[] = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lines.push({ type: "context", text: a[i - 1] })
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      lines.push({ type: "del", text: a[i - 1] })
      i--
    } else {
      lines.push({ type: "add", text: b[j - 1] })
      j--
    }
  }
  while (i > 0) {
    lines.push({ type: "del", text: a[i - 1] })
    i--
  }
  while (j > 0) {
    lines.push({ type: "add", text: b[j - 1] })
    j--
  }
  lines.reverse()
  return lines
}

function splitLines(text: string): string[] {
  if (text === "") return []
  const parts = text.split("\n")
  if (parts[parts.length - 1] === "") parts.pop()
  return parts
}

export function diffTexts(oldText: string, newText: string): {
  hunks: DiffHunk[]
  additions: number
  deletions: number
} {
  if (oldText === newText) {
    return { hunks: [], additions: 0, deletions: 0 }
  }
  const a = splitLines(oldText)
  const b = splitLines(newText)
  const ops = lcsOps(a, b)
  let additions = 0
  let deletions = 0
  for (const line of ops) {
    if (line.type === "add") additions++
    else if (line.type === "del") deletions++
  }

  const hunks: DiffHunk[] = []
  let oldLine = 1
  let newLine = 1
  let i = 0
  while (i < ops.length) {
    if (ops[i].type === "context") {
      if (ops[i].type === "context") {
        oldLine++
        newLine++
      }
      i++
      continue
    }
    const start = Math.max(0, i - 3)
    let end = i
    let lastChange = i
    while (end < ops.length) {
      if (ops[end].type !== "context") lastChange = end
      else if (end - lastChange > 6) break
      end++
    }
    end = Math.min(ops.length, lastChange + 4)
    const slice = ops.slice(start, end)
    let oldStart = oldLine
    let newStart = newLine
    for (let k = start; k < i; k++) {
      if (ops[k].type !== "add") oldStart--
      if (ops[k].type !== "del") newStart--
    }
    oldStart = Math.max(1, oldStart)
    newStart = Math.max(1, newStart)
    let oldLines = 0
    let newLines = 0
    for (const line of slice) {
      if (line.type !== "add") oldLines++
      if (line.type !== "del") newLines++
    }
    hunks.push({
      oldStart,
      oldLines,
      newStart,
      newLines,
      lines: slice,
    })
    for (let k = i; k < end; k++) {
      if (ops[k].type !== "add") oldLine++
      if (ops[k].type !== "del") newLine++
    }
    i = end
  }
  return { hunks, additions, deletions }
}

export function fileDiff(path: string, oldSha: string | undefined, newSha: string | undefined, oldContent: string | undefined, newContent: string | undefined): FileDiff {
  let status: FileDiff["status"]
  if (oldSha == null) status = "added"
  else if (newSha == null) status = "deleted"
  else status = "modified"
  const { hunks, additions, deletions } = diffTexts(oldContent ?? "", newContent ?? "")
  return {
    path,
    status,
    oldSha,
    newSha,
    oldContent,
    newContent,
    additions: status === "deleted" ? splitLines(oldContent ?? "").length || (oldContent ? 1 : 0) : additions,
    deletions: status === "added" ? 0 : deletions,
    hunks,
  }
}
