import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Copy01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DayTimeline from '@/components/DayTimeline'
import { occupancyOrder, occupancyStyles } from '@/lib/display'
import { errorMessage, type OccupancyState, type Transition, type WeeklySchedule } from '@/api/client'
import { useSaveSchedule, useSchedule } from '@/hooks/useThermostatStatus'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const satisfies (keyof WeeklySchedule)[]
type Day = (typeof DAYS)[number]

const stateItems = occupancyOrder.map((state) => ({ value: state, label: occupancyStyles[state].label }))

function today(): Day {
  // getDay() is 0 for Sunday; DAYS starts on Monday.
  return DAYS[(new Date().getDay() + 6) % 7]
}

// "HH:MM:SS" strings sort correctly as plain text.
function sortByTime(transitions: Transition[]) {
  return transitions.toSorted((a, b) => a.time.localeCompare(b.time))
}

function findProblems(schedule: WeeklySchedule) {
  const problems: string[] = []

  for (const day of DAYS) {
    const times = schedule[day].map((t) => t.time)
    if (times.some((time) => !time)) problems.push(`${day}: every transition needs a time`)

    const duplicate = times.find((time, i) => time && times.indexOf(time) !== i)
    if (duplicate) problems.push(`${day}: two transitions at ${duplicate.slice(0, 5)}`)
  }

  return problems
}

// A sensible next row: an hour after the last one, flipping occupied/unoccupied.
function nextTransition(transitions: Transition[]): Transition {
  const last = sortByTime(transitions).at(-1)
  if (!last?.time) return { time: '06:00:00', state: 'occupied' }

  const hour = Math.min(23, Number(last.time.slice(0, 2)) + 1)
  return {
    time: `${String(hour).padStart(2, '0')}:00:00`,
    state: last.state === 'occupied' ? 'unoccupied' : 'occupied',
  }
}

type ScheduleEditorProps = {
  id: string
}

function ScheduleEditor({ id }: ScheduleEditorProps) {
  const { data: saved, error } = useSchedule(id)
  const save = useSaveSchedule(id)

  // Unsaved edits to the whole week; null means "showing what the device has".
  const [draft, setDraft] = useState<WeeklySchedule | null>(null)
  const [day, setDay] = useState<Day>(today)
  // Days picked in the "Copy to" panel; null means the panel is closed.
  const [copyTargets, setCopyTargets] = useState<Day[] | null>(null)

  if (!saved) {
    return (
      <Card>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{errorMessage(error)}</p>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </CardContent>
      </Card>
    )
  }

  const schedule = draft ?? saved
  const transitions = schedule[day]
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)
  const problems = findProblems(schedule)

  function setTransitions(next: Transition[]) {
    setDraft({ ...schedule, [day]: next })
  }

  function updateRow(index: number, change: Partial<Transition>) {
    setTransitions(transitions.with(index, { ...transitions[index], ...change }))
  }

  function applyCopy() {
    if (!copyTargets) return
    const copies = Object.fromEntries(copyTargets.map((target) => [target, transitions.map((t) => ({ ...t }))]))
    setDraft({ ...schedule, ...copies })
    setCopyTargets(null)
  }

  function handleSave() {
    const body = Object.fromEntries(DAYS.map((d) => [d, sortByTime(schedule[d])])) as WeeklySchedule
    save.mutate(
      { params: { path: { thermostat_id: id } }, body },
      { onSuccess: () => setDraft(null) },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly schedule</CardTitle>
        <CardDescription>
          Each transition switches the occupancy state until the next one. Days start unoccupied.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          aria-label="Day"
          className="w-full"
          spacing={1}
          value={[day]}
          onValueChange={(value) => {
            if (!value[0]) return
            setDay(value[0] as Day)
            setCopyTargets(null)
          }}
        >
          {DAYS.map((d) => (
            <ToggleGroupItem
              key={d}
              value={d}
              className="h-10 min-w-0 flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <DayTimeline transitions={transitions} />

        <div className="flex flex-col gap-2">
          {transitions.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No transitions: unoccupied all day.</p>
          )}

          {transitions.map((transition, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                aria-label="Time"
                className="h-10 w-32 text-sm md:text-sm"
                value={transition.time.slice(0, 5)}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 5)
                  updateRow(index, { time: value ? `${value}:00` : '' })
                }}
              />
              <Select
                items={stateItems}
                value={transition.state}
                onValueChange={(value) => {
                  if (value) updateRow(index, { state: value as OccupancyState })
                }}
              >
                <SelectTrigger className="min-w-0 flex-1 text-sm data-[size=default]:h-10" aria-label="State">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="size-10"
                aria-label="Remove transition"
                onClick={() => setTransitions(transitions.filter((_, i) => i !== index))}
              >
                <HugeiconsIcon icon={Delete02Icon} size={18} />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-10 flex-1" onClick={() => setTransitions([...transitions, nextTransition(transitions)])}>
            <HugeiconsIcon icon={Add01Icon} size={16} />
            Add transition
          </Button>
          <Button
            variant="outline"
            className="h-10 flex-1"
            onClick={() => setCopyTargets(copyTargets ? null : [])}
          >
            <HugeiconsIcon icon={Copy01Icon} size={16} />
            Copy {day} to…
          </Button>
        </div>

        {copyTargets && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
            <ToggleGroup
              aria-label="Copy to days"
              multiple
              variant="outline"
              className="w-full"
              spacing={1}
              value={copyTargets}
              onValueChange={(value) => setCopyTargets(value as Day[])}
            >
              {DAYS.filter((d) => d !== day).map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={d}
                  className="h-10 min-w-0 flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {d}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-9" onClick={() => setCopyTargets(null)}>
                Cancel
              </Button>
              <Button className="h-9" disabled={copyTargets.length === 0} onClick={applyCopy}>
                Copy
              </Button>
            </div>
          </div>
        )}

        {problems.length > 0 && (
          <ul className="text-sm text-destructive">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="ghost" className="h-10" disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>
          Reset
        </Button>
        <Button className="h-10 px-4" disabled={!dirty || problems.length > 0 || save.isPending} onClick={handleSave}>
          {save.isPending ? 'Saving…' : 'Save schedule'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default ScheduleEditor
