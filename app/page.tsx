'use client'

import { useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronDown,
  CircleDot,
  Code2,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Star,
  Users,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const repositories = [
  { name: 'orbit-web', language: 'TypeScript', color: 'bg-chart-2', stars: 128 },
  { name: 'design-tokens', language: 'CSS', color: 'bg-chart-4', stars: 42 },
  { name: 'api-gateway', language: 'Go', color: 'bg-chart-3', stars: 86 },
  { name: 'docs', language: 'MDX', color: 'bg-chart-5', stars: 19 },
]

const issues = [
  { title: 'Add keyboard navigation to command menu', repo: 'orbit-web', number: 248, label: 'enhancement', tone: 'bg-secondary text-secondary-foreground', age: '2 hours ago' },
  { title: 'Fix hydration mismatch on settings page', repo: 'orbit-web', number: 245, label: 'bug', tone: 'bg-destructive/10 text-destructive', age: '5 hours ago' },
  { title: 'Document local development setup', repo: 'docs', number: 91, label: 'documentation', tone: 'bg-accent text-accent-foreground', age: 'yesterday' },
  { title: 'Upgrade Go runtime to 1.24', repo: 'api-gateway', number: 77, label: 'dependencies', tone: 'bg-muted text-muted-foreground', age: '2 days ago' },
]

export default function Page() {
  const [query, setQuery] = useState('')
  const [starred, setStarred] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const filteredIssues = useMemo(() => issues.filter((issue) => issue.title.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation"><Menu /></Button>
          <div className="flex items-center gap-3 font-semibold tracking-tight"><Code2 className="size-7" /><span className="hidden sm:inline">Northstar</span></div>
          <div className="relative ml-auto w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories, issues..." className="pl-9" /></div>
          <nav className="hidden items-center gap-1 md:flex"><Button variant="ghost" size="sm">Pull requests <Badge variant="secondary" className="ml-2">12</Badge></Button><Button variant="ghost" size="sm">Issues <Badge variant="secondary" className="ml-2">7</Badge></Button></nav>
          <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
          <Avatar className="size-8"><AvatarFallback>AS</AvatarFallback></Avatar>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${mobileOpen ? 'block' : 'hidden'} fixed inset-y-16 left-0 z-10 w-72 border-r bg-card p-5 lg:static lg:block lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0`}>
          <div className="mb-6 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</span><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></Button></div>
          <div className="flex flex-col gap-1"><Button variant="secondary" className="justify-start gap-3"><LayoutDashboard />Overview</Button><Button variant="ghost" className="justify-start gap-3"><Code2 />Repositories <span className="ml-auto text-xs text-muted-foreground">18</span></Button><Button variant="ghost" className="justify-start gap-3"><CircleDot />Issues <span className="ml-auto text-xs text-muted-foreground">7</span></Button><Button variant="ghost" className="justify-start gap-3"><GitPullRequest />Pull requests <span className="ml-auto text-xs text-muted-foreground">12</span></Button><Button variant="ghost" className="justify-start gap-3"><Users />Teams</Button></div>
          <Separator className="my-6" />
          <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your repositories</span><Button variant="ghost" size="icon" aria-label="Create repository"><Plus /></Button></div>
          <div className="flex flex-col gap-1">{repositories.map((repo) => <Button key={repo.name} variant="ghost" className="justify-start gap-3"><span className={`size-2 rounded-full ${repo.color}`} />{repo.name}<span className="ml-auto text-xs text-muted-foreground">{repo.stars}</span></Button>)}</div>
          <div className="mt-8 rounded-lg border bg-muted/40 p-4"><p className="text-sm font-medium">Build with confidence</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Protect branches, review changes, and ship better code together.</p><Button variant="outline" size="sm" className="mt-3 w-full">Explore features</Button></div>
        </aside>

        <main className="min-w-0 flex-1 p-5 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Wednesday, September 2, 2026</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Good morning, Alex</h1><p className="mt-2 text-muted-foreground">Here&apos;s what&apos;s happening across your workspace.</p></div><div className="flex gap-2"><Button variant="outline"><Settings data-icon="inline-start" />Manage</Button><Button><Plus data-icon="inline-start" />New repository</Button></div></div>
            <section className="grid gap-4 py-7 sm:grid-cols-3"><Stat icon={<GitBranch />} label="Contributions" value="184" detail="+24 this week" /><Stat icon={<GitPullRequest />} label="Open pull requests" value="12" detail="4 need your review" /><Stat icon={<CircleDot />} label="Open issues" value="7" detail="2 assigned to you" /></section>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Your work</h2><p className="text-sm text-muted-foreground">Issues and pull requests that need attention.</p></div><Button variant="ghost" size="sm">View all <ChevronDown data-icon="inline-end" /></Button></div><div className="rounded-lg border bg-card"><Tabs defaultValue="issues"><TabsList className="h-12 w-full justify-start rounded-b-none border-b bg-transparent px-4"><TabsTrigger value="issues">Issues <Badge variant="secondary" className="ml-2">7</Badge></TabsTrigger><TabsTrigger value="pulls">Pull requests <Badge variant="secondary" className="ml-2">12</Badge></TabsTrigger></TabsList></Tabs><div className="divide-y">{filteredIssues.length ? filteredIssues.map((issue) => <div key={issue.number} className="flex gap-3 p-4 transition-colors hover:bg-muted/40"><CircleDot className="mt-1 size-4 shrink-0 text-chart-2" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{issue.title}</p><Badge className={issue.tone}>{issue.label}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{issue.repo} <span className="text-border">·</span> #{issue.number} opened {issue.age}</p></div><Button variant="ghost" size="icon" aria-label={`Star issue ${issue.number}`}><Star /></Button></div>) : <div className="p-10 text-center text-sm text-muted-foreground">No issues match your search.</div>}</div></div></section>
              <aside className="flex flex-col gap-6"><section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Popular repositories</h2><Button variant="link" size="sm">See all</Button></div><div className="flex flex-col gap-3">{repositories.slice(0, 3).map((repo) => <div key={repo.name} className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><p className="font-medium">{repo.name}</p><Button variant={starred && repo.name === 'orbit-web' ? 'secondary' : 'outline'} size="sm" onClick={() => repo.name === 'orbit-web' && setStarred(!starred)}><Star data-icon="inline-start" className={starred && repo.name === 'orbit-web' ? 'fill-current' : ''} />{starred && repo.name === 'orbit-web' ? 'Starred' : 'Star'}</Button></div><p className="mt-2 text-sm text-muted-foreground">A focused toolkit for building calm, fast interfaces.</p><div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><span className={`size-2 rounded-full ${repo.color}`} />{repo.language}</span><span className="flex items-center gap-1"><Star className="size-3" />{repo.stars}</span></div></div>)}</div></section><section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Recent activity</h2><div className="mt-4 flex flex-col gap-4 text-sm"><Activity title="merged pull request #241" repo="orbit-web" time="3 hours ago" /><Activity title="opened issue #248" repo="orbit-web" time="5 hours ago" /><Activity title="pushed 3 commits to main" repo="api-gateway" time="yesterday" /></div></section></aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><div className="mt-4 flex items-end justify-between"><span className="text-3xl font-semibold tracking-tight">{value}</span><span className="text-xs text-muted-foreground">{detail}</span></div></div> }
function Activity({ title, repo, time }: { title: string; repo: string; time: string }) { return <div className="flex gap-3"><Avatar className="size-7"><AvatarFallback>AS</AvatarFallback></Avatar><p className="leading-relaxed"><span className="font-medium">You</span> {title} in <span className="font-medium">{repo}</span><span className="block text-xs text-muted-foreground">{time}</span></p></div> }
