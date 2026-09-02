"use client"

import { useEffect, useState } from "react"

import { timeAgo } from "@/lib/platform/time"
import { cn } from "@/lib/utils"

export function RelativeTime({
  at,
  className,
}: {
  at: string | number
  className?: string
}) {
  const [label, setLabel] = useState(() => timeAgo(at))

  useEffect(() => {
    const tick = () => setLabel(timeAgo(at))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [at])

  const dateTime = typeof at === "number" ? new Date(at * 1000).toISOString() : at

  return (
    <time className={cn(className)} dateTime={dateTime} suppressHydrationWarning>
      {label}
    </time>
  )
}
