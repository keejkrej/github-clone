import { listLabels } from "@/lib/platform/store"
import { cn } from "@/lib/utils"

export function labelColors(hex: string): { backgroundColor: string; color: string; borderColor: string } {
  const raw = hex.replace("#", "")
  const value = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw.padEnd(6, "0").slice(0, 6)
  const r = parseInt(value.slice(0, 2), 16) || 0
  const g = parseInt(value.slice(2, 4), 16) || 0
  const b = parseInt(value.slice(4, 6), 16) || 0
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return {
    backgroundColor: `#${value}`,
    color: luminance > 0.62 ? "#24292f" : "#ffffff",
    borderColor: `rgba(0,0,0,0.12)`,
  }
}

export function LabelPill({
  name,
  color,
  className,
}: {
  name: string
  color?: string
  className?: string
}) {
  const style = labelColors(color ?? "d0d7de")
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full items-center rounded-full border px-2 text-[11px] font-medium leading-none",
        className,
      )}
      style={style}
      title={name}
    >
      <span className="truncate">{name}</span>
    </span>
  )
}

export function LabelPills({ repoId, names }: { repoId: string; names: string[] }) {
  if (names.length === 0) return null
  const labels = listLabels(repoId)
  return (
    <>
      {names.map((name) => {
        const label = labels.find((item) => item.name === name)
        return <LabelPill key={name} name={name} color={label?.color} />
      })}
    </>
  )
}
