import Link from "next/link"

import { cn } from "@/lib/utils"

export type UnderlineTab = {
  href: string
  label: string
  icon?: React.ReactNode
  count?: number | string
  active?: boolean
  disabled?: boolean
}

export function UnderlineNav({
  tabs,
  className,
  accent = "coral",
}: {
  tabs: UnderlineTab[]
  className?: string
  accent?: "coral" | "dark"
}) {
  return (
    <nav className={cn("flex gap-1 overflow-x-auto border-b", className)}>
      {tabs.map((tab) => {
        const className = cn(
          "relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm",
          tab.disabled && "pointer-events-none opacity-60",
          tab.active
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground hover:text-foreground",
        )
        const inner = (
          <>
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tab.count}
              </span>
            )}
            {tab.active && (
              <span
                className={cn(
                  "absolute inset-x-2 bottom-[-1px] h-[2px] rounded-t",
                  accent === "coral" ? "bg-[#fd8c73]" : "bg-foreground",
                )}
              />
            )}
          </>
        )
        if (tab.disabled) {
          return (
            <span key={`${tab.href}:${tab.label}`} className={className} aria-disabled="true" title="Coming soon">
              {inner}
            </span>
          )
        }
        return (
          <Link key={`${tab.href}:${tab.label}`} href={tab.href} className={className}>
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
