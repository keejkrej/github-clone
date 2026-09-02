import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[85%]">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link) {
        const href = link[2]
        const label = link[1]
        const className = "text-[#0969da] hover:underline"
        if (href.startsWith("/")) {
          out.push(
            <Link key={key} href={href} className={className}>
              {label}
            </Link>,
          )
        } else {
          out.push(
            <a
              key={key}
              href={href}
              className={className}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {label}
            </a>,
          )
        }
      }
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; lang: string; text: string }
  | { type: "quote"; text: string }

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === "") {
      i++
      continue
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i])
        i++
      }
      if (i < lines.length) i++
      blocks.push({ type: "code", lang, text: body.join("\n") })
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4,
        text: heading[2],
      })
      i++
      continue
    }
    if (line.startsWith("> ")) {
      const quoted: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoted.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: "quote", text: quoted.join(" ") })
      continue
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ""))
        i++
      }
      blocks.push({ type: "list", ordered, items })
      continue
    }
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: "paragraph", text: para.join(" ") })
  }
  return blocks
}

const headingClass: Record<number, string> = {
  1: "mt-2 mb-4 border-b pb-2 text-3xl font-semibold",
  2: "mt-6 mb-3 border-b pb-2 text-2xl font-semibold",
  3: "mt-5 mb-2 text-xl font-semibold",
  4: "mt-4 mb-2 text-base font-semibold",
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source)
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = (`h${block.level}` as unknown) as "h1"
          return (
            <Tag key={index} className={headingClass[block.level]}>
              {renderInline(block.text, `h-${index}`)}
            </Tag>
          )
        }
        if (block.type === "code") {
          return (
            <pre key={index} className="my-3 overflow-x-auto rounded-md bg-[#f6f8fa] p-4 font-mono text-xs">
              <code>{block.text}</code>
            </pre>
          )
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul"
          return (
            <List
              key={index}
              className={cn("my-3 space-y-1 pl-6", block.ordered ? "list-decimal" : "list-disc")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `l-${index}-${itemIndex}`)}</li>
              ))}
            </List>
          )
        }
        if (block.type === "quote") {
          return (
            <blockquote key={index} className="my-3 border-l-4 pl-4 text-muted-foreground">
              {renderInline(block.text, `q-${index}`)}
            </blockquote>
          )
        }
        return (
          <p key={index} className="my-3">
            {renderInline(block.text, `p-${index}`)}
          </p>
        )
      })}
    </div>
  )
}
