"use client"

import { useEffect, useSyncExternalStore } from "react"

import * as platform from "./store"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    platform.hydrateFromStorage()
  }, [])
  return children
}

export function usePlatform() {
  return useSyncExternalStore(
    platform.subscribe,
    platform.getSnapshot,
    platform.getServerSnapshot,
  )
}
