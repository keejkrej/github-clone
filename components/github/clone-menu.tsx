"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Repository } from "@/lib/platform/types"

export function cloneUrl(repo: Repository): string {
  return `https://github.local/${repo.ownerLogin}/${repo.name}.git`
}

export function CloneMenu({ repo }: { repo: Repository }) {
  const url = cloneUrl(repo)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(id)
  }, [toast])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setToast("Could not copy clone URL.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
          Code
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 min-w-80 p-3">
          <div className="text-sm font-semibold">Clone</div>
          <p className="mt-1 text-xs text-muted-foreground">HTTPS</p>
          <div className="mt-2 flex items-center gap-1">
            <Input readOnly value={url} className="h-8 font-mono text-xs" />
            <Button type="button" variant="outline" size="icon-sm" onClick={copy} aria-label="Copy clone URL">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => setToast("ZIP download isn’t available in this clone.")}
          >
            Download ZIP
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-foreground px-3 py-2 text-sm text-background shadow-md">
          {toast}
        </div>
      ) : null}
    </>
  )
}
