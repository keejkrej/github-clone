import Link from "next/link"

export function PathBreadcrumb({
  owner,
  name,
  refName,
  path,
  kind,
}: {
  owner: string
  name: string
  refName: string
  path: string
  kind: "tree" | "blob"
}) {
  const parts = path.split("/").filter(Boolean)
  const refSeg = encodeURIComponent(refName)
  const base = `/${owner}/${name}`
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <Link href={`${base}/tree/${refSeg}`} className="font-semibold text-[#0969da] hover:underline">
        {name}
      </Link>
      {parts.map((part, index) => {
        const current = parts.slice(0, index + 1).join("/")
        const last = index === parts.length - 1
        const href =
          last && kind === "blob"
            ? `${base}/blob/${refSeg}/${current}`
            : `${base}/tree/${refSeg}/${current}`
        return (
          <span key={current} className="flex min-w-0 items-center gap-1">
            <span className="text-muted-foreground">/</span>
            {last ? (
              <span className={kind === "blob" ? "font-semibold" : "font-semibold text-[#0969da]"}>{part}</span>
            ) : (
              <Link href={href} className="text-[#0969da] hover:underline">
                {part}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
