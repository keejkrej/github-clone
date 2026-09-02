"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { File } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { usePlatform } from "@/lib/platform/provider"
import { gitReadFiles } from "@/lib/platform/store"

export function GoToFile({
  owner,
  name,
  repoId,
  refName,
}: {
  owner: string
  name: string
  repoId: string
  refName: string
}) {
  const router = useRouter()
  const { rev } = usePlatform()
  const [open, setOpen] = useState(false)
  const files = useMemo(() => Object.keys(gitReadFiles(repoId, refName)).sort(), [repoId, refName, rev])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "t" && event.key !== "T") return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
      >
        Go to file
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Go to file"
        description="Search files in this repository"
      >
        <Command>
          <CommandInput placeholder="Search files..." />
          <CommandList>
            <CommandEmpty>No matching files.</CommandEmpty>
            <CommandGroup heading="Files">
              {files.map((path) => (
                <CommandItem
                  key={path}
                  value={path}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/${owner}/${name}/blob/${encodeURIComponent(refName)}/${path}`)
                  }}
                >
                  <File className="size-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
