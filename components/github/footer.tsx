import Link from "next/link"

import { GitHubMark } from "@/components/github/mark"

const links = [
  { href: "https://docs.github.com/site-policy/github-terms/github-terms-of-service", label: "Terms" },
  { href: "https://docs.github.com/site-policy/privacy-policies/github-privacy-statement", label: "Privacy" },
  { href: "https://github.com/security", label: "Security" },
  { href: "https://www.githubstatus.com", label: "Status" },
  { href: "https://docs.github.com", label: "Docs" },
  { href: "https://support.github.com", label: "Contact" },
  { href: "https://github.com/pricing", label: "Pricing" },
  { href: "https://docs.github.com/rest", label: "API" },
]

export function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-xs text-muted-foreground">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <GitHubMark className="size-5" />
          <span>© 2026 GitHub, Inc.</span>
        </Link>
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="hover:text-blue-600 hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  )
}
