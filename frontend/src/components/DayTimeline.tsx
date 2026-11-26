import { cn } from '@/lib/utils'
import { occupancyStyles } from '@/lib/display'
import type { OccupancyState, Transition } from '@/api/client'

const DAY_MINUTES = 24 * 60

// The TC500A's schedule default is fixed at Unoccupied (Integration Guide, Table 46),
// so each day starts unoccupied until its first transition.
const DAY_START_STATE: OccupancyState = 'unoccupied'

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

type Segment = { start: number; end: number; state: OccupancyState }

function segments(transitions: Transition[]): Segment[] {
  const points = transitions
    .filter((t) => t.time)
    .map((t) => ({ at: toMinutes(t.time), state: t.state }))
    .sort((a, b) => a.at - b.at)

  const result: Segment[] = []
  let start = 0
  let state = DAY_START_STATE

  for (const point of points) {
    if (point.at > start) result.push({ start, end: point.at, state })
    start = point.at
    state = point.state
  }
  result.push({ start, end: DAY_MINUTES, state })

  return result
}

type DayTimelineProps = {
  transitions: Transition[]
}

// A 24-hour bar showing which occupancy state is active when.
function DayTimeline({ transitions }: DayTimelineProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-8 overflow-hidden rounded-md" role="img" aria-label="Occupancy over the day">
        {segments(transitions).map((segment) => (
          <div
            key={segment.start}
            className={cn('h-full border-r border-background last:border-r-0', occupancyStyles[segment.state].bar)}
            style={{ width: `${((segment.end - segment.start) / DAY_MINUTES) * 100}%` }}
            title={occupancyStyles[segment.state].label}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.625rem] text-muted-foreground tabular-nums">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}

export default DayTimeline
