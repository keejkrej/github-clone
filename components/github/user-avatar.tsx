"use client"

import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usePlatform } from "@/lib/platform/provider"
import { cn } from "@/lib/utils"

export function avatarColor(login: string): string {
  let hash = 0
  for (let i = 0; i < login.length; i++) hash = (hash * 31 + login.charCodeAt(i)) >>> 0
  return `hsl(${hash % 360} 42% 38%)`
}

export function UserAvatar({
  login,
  className,
  fallbackClassName,
  linked = false,
}: {
  login: string
  className?: string
  fallbackClassName?: string
  linked?: boolean
}) {
  const { state } = usePlatform()
  const actor =
    state.users.find((item) => item.login === login) ??
    state.orgs.find((item) => item.login === login)
  const initials = actor?.avatarInitials ?? login.slice(0, 2).toUpperCase()
  const avatar = (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback
        className={cn("text-[11px] font-semibold text-white", fallbackClassName)}
        style={{ background: avatarColor(login) }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
  if (!linked) return avatar
  return (
    <Link href={`/${login}`} className="shrink-0" aria-label={login}>
      {avatar}
    </Link>
  )
}
