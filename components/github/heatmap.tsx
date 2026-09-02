import { cn } from "@/lib/utils"

function heatLevel(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""]

export function ContributionHeatmap({
  days,
}: {
  days: { date: string; count: number }[]
}) {
  const total = days.reduce((sum, day) => sum + day.count, 0)
  if (days.length === 0) {
    return (
      <div>
        <h2 className="mb-3 text-base">0 contributions in the last year</h2>
        <p className="text-sm text-muted-foreground">No contribution data yet.</p>
      </div>
    )
  }

  const first = new Date(`${days[0].date}T00:00:00Z`)
  const pad = first.getUTCDay()
  const cells: { date: string; count: number }[] = []
  for (let i = pad; i > 0; i--) {
    const date = new Date(first)
    date.setUTCDate(date.getUTCDate() - i)
    cells.push({ date: date.toISOString().slice(0, 10), count: 0 })
  }
  cells.push(...days)
  while (cells.length % 7 !== 0) {
    const last = new Date(`${cells[cells.length - 1].date}T00:00:00Z`)
    last.setUTCDate(last.getUTCDate() + 1)
    cells.push({ date: last.toISOString().slice(0, 10), count: 0 })
  }

  const weeks: { date: string; count: number }[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const months: { label: string; col: number }[] = []
  let lastMonth = ""
  weeks.forEach((week, col) => {
    const label = new Date(`${week[0].date}T00:00:00Z`).toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    })
    if (label !== lastMonth) {
      months.push({ label, col })
      lastMonth = label
    }
  })

  return (
    <div>
      <h2 className="mb-3 text-base">
        {total} contribution{total === 1 ? "" : "s"} in the last year
      </h2>
      <div className="overflow-x-auto rounded-md border p-3">
        <div className="inline-block min-w-full">
          <div
            className="mb-1 grid text-[10px] text-muted-foreground"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, 11px)`,
              columnGap: 3,
            }}
          >
            <span />
            {months.map((month) => (
              <span
                key={`${month.label}-${month.col}`}
                style={{ gridColumn: month.col + 2 }}
              >
                {month.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-7 flex-col gap-[3px] pr-1 text-[10px] leading-[11px] text-muted-foreground">
              {WEEKDAYS.map((label, index) => (
                <span key={index} className="h-[11px]">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week[0].date} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <span
                      key={day.date}
                      title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                      className={cn("size-[11px] rounded-[2px]", `gh-heat-${heatLevel(day.count)}`)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={cn("size-[11px] rounded-[2px]", `gh-heat-${level}`)} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}
