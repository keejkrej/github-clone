"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { usePlatform } from "@/lib/platform/provider"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/platform/store"
import { RelativeTime } from "@/components/github/relative-time"

export default function NotificationsPage() {
  const { state } = usePlatform()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const items = listNotifications(state.sessionLogin)
  const visible = filter === "unread" ? items.filter((item) => item.unread) : items
  const unread = items.filter((item) => item.unread).length

  return (
    <div className="mx-auto w-full max-w-[1012px] px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread === 0 ? "You're all caught up." : `${unread} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border text-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 ${filter === "all" ? "bg-muted font-semibold" : "hover:bg-muted/50"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`border-l px-3 py-1.5 ${filter === "unread" ? "bg-muted font-semibold" : "hover:bg-muted/50"}`}
            >
              Unread
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unread === 0}
            onClick={() => markAllNotificationsRead()}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {filter === "unread"
              ? "You don’t have any unread notifications."
              : "You don’t have any notifications."}
          </p>
        ) : (
          visible.map((item) => {
            const href =
              item.subject.type === "repo"
                ? `/${item.subject.repoId}`
                : item.subject.type === "pull"
                  ? `/${item.subject.repoId}/pull/${item.subject.number}`
                  : `/${item.subject.repoId}/issues/${item.subject.number}`
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 border-b px-4 py-3 last:border-b-0 ${item.unread ? "bg-[#ddf4ff]/40" : ""}`}
              >
                <span
                  className={`mt-2 size-2 shrink-0 rounded-full ${item.unread ? "bg-[#0969da]" : "bg-transparent"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{item.subject.repoId}</div>
                  <Link
                    href={href}
                    className="text-sm font-semibold hover:text-[#0969da] hover:underline"
                    onClick={() => {
                      if (item.unread) markNotificationRead(item.id)
                    }}
                  >
                    {item.subject.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {item.reason} · <RelativeTime at={item.createdAt} />
                  </div>
                </div>
                {item.unread && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => markNotificationRead(item.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
