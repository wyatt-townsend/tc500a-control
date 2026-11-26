import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatTemp } from '@/lib/display'
import type { OccupancyState } from '@/api/client'
import { useSetSetpoint, useSetpoint, type SetpointKind } from '@/hooks/useThermostatStatus'

// The API accepts 40–120 °F (SetpointValue in schema.py).
const MIN = 40
const MAX = 120

// Taps within this window are combined into one BACnet write.
const DEBOUNCE_MS = 800

type SetpointStepperProps = {
  id: string
  kind: SetpointKind
  state: OccupancyState | undefined
  size?: 'lg' | 'sm'
}

function SetpointStepper({ id, kind, state, size = 'lg' }: SetpointStepperProps) {
  const { data } = useSetpoint(id, kind, state)
  const save = useSetSetpoint(id, kind)

  // The value the user has tapped to but that the device hasn't confirmed yet.
  const [pending, setPending] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  const shown = pending ?? data?.setpoint

  function step(delta: number) {
    if (shown === undefined || state === undefined) return

    const next = Math.min(MAX, Math.max(MIN, Math.round(shown + delta)))
    setPending(next)

    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      save.mutate(
        { params: { path: { thermostat_id: id, state } }, body: { setpoint: next } },
        {
          // Show the device's read-back value, unless the user has tapped again since.
          onSettled: () => {
            if (timer.current === null) setPending(null)
          },
        },
      )
    }, DEBOUNCE_MS)
  }

  const large = size === 'lg'
  const accent = kind === 'heat' ? 'text-heat' : 'text-cool'
  const buttonClass = cn('rounded-full', large ? 'size-14' : 'size-11')
  const iconSize = large ? 24 : 18

  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className={buttonClass}
        aria-label={`Lower ${kind} setpoint`}
        disabled={shown === undefined || shown <= MIN}
        onClick={() => step(-1)}
      >
        <HugeiconsIcon icon={MinusSignIcon} size={iconSize} />
      </Button>

      <div className="flex flex-col items-center" aria-live="polite">
        {large && (
          <span className={cn('text-xs font-medium tracking-wider uppercase', accent)}>
            {kind === 'heat' ? 'Heat to' : 'Cool to'}
          </span>
        )}
        <span
          className={cn(
            'font-light tabular-nums transition-opacity',
            large ? 'text-4xl' : cn('text-xl', accent),
            pending !== null && 'opacity-60',
          )}
        >
          {shown === undefined ? '--' : formatTemp(shown)}°
        </span>
      </div>

      <Button
        variant="outline"
        className={buttonClass}
        aria-label={`Raise ${kind} setpoint`}
        disabled={shown === undefined || shown >= MAX}
        onClick={() => step(1)}
      >
        <HugeiconsIcon icon={PlusSignIcon} size={iconSize} />
      </Button>
    </div>
  )
}

export default SetpointStepper
