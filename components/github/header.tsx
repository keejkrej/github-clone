"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Plus, Search } from "lucide-react"

import { GitHubMark } from "@/components/github/mark"
import { UserAvatar } from "@/components/github/user-avatar"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePlatform } from "@/lib/platform/provider"
import { unreadNotificationCount } from "@/lib/platform/store"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const router = useRouter()
  const { state } = usePlatform()
  const user = state.users.find((item) => item.login === state.sessionLogin)
  const unread = unreadNotificationCount(state.sessionLogin)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  function goSearch(value = query) {
    const q = value.trim()
    setOpen(false)
    setQuery("")
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
      if (event.key === "/" && event.target === document.body) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-foreground text-background">
      <div className="flex h-16 items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-background">
          <GitHubMark className="size-8" />
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">GitHub</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 min-w-0 max-w-[320px] flex-1 items-center rounded-md border border-background/25 bg-background/10 px-3 text-left text-sm text-background/70 hover:bg-background/15"
          aria-label="Search or jump to"
        >
          <span className="truncate">Search or jump to...</span>
          <kbd className="ml-auto hidden rounded border border-background/25 px-1.5 font-mono text-[11px] text-background/60 sm:inline">
            /
          </kbd>
        </button>

        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          <Link href="/pulls" className="rounded-md px-2 py-1 hover:text-background/80">
            Pull requests
          </Link>
          <Link href="/issues" className="rounded-md px-2 py-1 hover:text-background/80">
            Issues
          </Link>
          <span className="rounded-md px-2 py-1 text-background/80">Marketplace</span>
          <Link href="/search" className="rounded-md px-2 py-1 hover:text-background/80">
            Explore
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative rounded-md p-2 text-background hover:bg-background/10"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-foreground" />
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md text-background hover:bg-background/10",
              )}
              aria-label="Create new"
            >
              <Plus className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/new")}>New repository</DropdownMenuItem>
              <DropdownMenuItem disabled>New gist</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/octocat/hello-world/issues/new")}>
                New issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-background/40"
              aria-label="View profile and more"
            >
              <UserAvatar login={user?.login ?? "octocat"} className="size-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                Signed in as
                <div className="font-semibold text-foreground">{user?.login ?? "octocat"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${user?.login ?? "octocat"}`)}>
                Your profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${user?.login ?? "octocat"}?tab=repositories`)}>
                Your repositories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${user?.login ?? "octocat"}?tab=stars`)}>
                Your stars
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/new")}>New repository</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
        title="Search or jump to"
        description="Search GitHub or jump to a repository"
      >
        <Command>
          <CommandInput
            placeholder="Search or jump to..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault()
                goSearch()
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No repositories found.</CommandEmpty>
            <CommandGroup heading="Search">
              <CommandItem value={`search github ${query}`} onSelect={() => goSearch()}>
                <Search className="size-4 text-muted-foreground" />
                {query.trim() ? (
                  <span>
                    Search GitHub for <span className="font-medium">“{query.trim()}”</span>
                  </span>
                ) : (
                  <span>Search GitHub</span>
                )}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Repositories">
              {state.repos.map((repo) => (
                <CommandItem
                  key={repo.id}
                  value={repo.id}
                  onSelect={() => {
                    setOpen(false)
                    setQuery("")
                    router.push(`/${repo.ownerLogin}/${repo.name}`)
                  }}
                >
                  <span className="font-medium">{repo.ownerLogin}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{repo.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}
