import { FileDiff as FileIcon } from "lucide-react"

import type { FileDiff } from "@/lib/git"
import { cn } from "@/lib/utils"

export function DiffStats({ diffs }: { diffs: FileDiff[] }) {
  const additions = diffs.reduce((sum, file) => sum + file.additions, 0)
  const deletions = diffs.reduce((sum, file) => sum + file.deletions, 0)
  return (
    <span className="text-sm">
      <span className="font-semibold">{diffs.length}</span> file{diffs.length === 1 ? "" : "s"} changed
      {additions > 0 ? <span className="ml-2 font-semibold gh-open">+{additions}</span> : null}
      {deletions > 0 ? <span className="ml-2 font-semibold gh-closed">−{deletions}</span> : null}
    </span>
  )
}

export function DiffView({ diffs }: { diffs: FileDiff[] }) {
  if (diffs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No files changed.</p>
  }
  return (
    <div className="space-y-4">
      {diffs.map((file) => (
        <FilePatch key={file.path} file={file} />
      ))}
    </div>
  )
}

function FilePatch({ file }: { file: FileDiff }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
        <FileIcon className="size-4 text-muted-foreground" />
        <span className="font-mono text-xs font-medium">{file.path}</span>
        <span className="ml-auto text-xs">
          <span className="gh-open">+{file.additions}</span>{" "}
          <span className="gh-closed">−{file.deletions}</span>
        </span>
      </div>
      <div className="overflow-x-auto font-mono text-xs leading-5">
        {file.hunks.length === 0 ? (
          <p className="px-3 py-3 text-muted-foreground">No textual diff.</p>
        ) : (
          file.hunks.map((hunk, hunkIndex) => {
            let oldLine = hunk.oldStart
            let newLine = hunk.newStart
            return (
              <table key={hunkIndex} className="w-full">
                <tbody>
                  <tr className="bg-[#ddf4ff] text-[#0969da]">
                    <td className="w-12 px-2 text-right select-none"> </td>
                    <td className="w-12 px-2 text-right select-none"> </td>
                    <td className="px-3 whitespace-pre">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </td>
                  </tr>
                  {hunk.lines.map((line, lineIndex) => {
                    const row = (
                      <tr
                        key={lineIndex}
                        className={cn(
                          line.type === "add" && "gh-add-bg",
                          line.type === "del" && "gh-del-bg",
                        )}
                      >
                        <td className="w-12 border-r px-2 text-right text-muted-foreground select-none">
                          {line.type === "add" ? "" : oldLine}
                        </td>
                        <td className="w-12 border-r px-2 text-right text-muted-foreground select-none">
                          {line.type === "del" ? "" : newLine}
                        </td>
                        <td className="whitespace-pre px-3">
                          <span className="mr-2 select-none text-muted-foreground">
                            {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
                          </span>
                          {line.text}
                        </td>
                      </tr>
                    )
                    if (line.type !== "add") oldLine++
                    if (line.type !== "del") newLine++
                    return row
                  })}
                </tbody>
              </table>
            )
          })
        )}
      </div>
    </div>
  )
}
