import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"

import { AppFooter } from "@/components/github/footer"
import { AppHeader } from "@/components/github/header"
import { StoreProvider } from "@/lib/platform/provider"

import "./globals.css"

export const metadata: Metadata = {
  title: "GitHub",
  description: "GitHub is where people build software.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "white",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="min-h-screen antialiased">
        <StoreProvider>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <AppHeader />
            <div className="flex-1">{children}</div>
            <AppFooter />
          </div>
        </StoreProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
