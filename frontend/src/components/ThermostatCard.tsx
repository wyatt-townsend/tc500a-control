import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, DropletIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ModeToggle from '@/components/ModeToggle'
import SetpointStepper from '@/components/SetpointStepper'
import { displayName, modeStyles, occupancyStyles } from '@/lib/display'
import type { SystemMode } from '@/api/client'
import { useThermostatStatus, type SetpointKind } from '@/hooks/useThermostatStatus'

type ThermostatCardProps = {
  id: string
}

const setpointsForMode: Record<SystemMode, SetpointKind[]> = {
  off: [],
  heat: ['heat'],
  'emergency-heat': ['heat'],
  cool: ['cool'],
  auto: ['heat', 'cool'],
}

function ThermostatCard({ id }: ThermostatCardProps) {
  const { status, error } = useThermostatStatus(id)

  return (
    <Card
      data-mode={status?.mode}
      className={cn(
        'h-full gap-6 rounded-3xl bg-radial-[at_50%_0%] to-card to-70% py-6 [--card-spacing:--spacing(5)] transition-colors',
        status && modeStyles[status.mode].tint,
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg capitalize">{displayName(id)}</CardTitle>
        <div>
          {status && (
            <Badge variant="secondary">{occupancyStyles[status.occupancy].label}</Badge>
          )}
        </div>
        <CardAction>
          <Link
            to={`/thermostats/${id}/schedule`}
            aria-label="Schedule and setpoints"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-lg' }), 'size-11 rounded-full')}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={20} />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col items-center justify-center gap-1">
        {status ? (
          <>
            <span className="text-8xl font-extralight tracking-tighter tabular-nums">
              {Math.round(status.temperature)}°
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <HugeiconsIcon icon={DropletIcon} size={16} />
              {Math.round(status.humidity)}%
            </span>
            {error && <span className="text-destructive">Offline, showing last reading</span>}
          </>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <Skeleton className="h-24 w-40" />
        )}
      </CardContent>

      {status && (
        <CardContent className="flex flex-col gap-4">
          {status.mode === 'off' ? (
            <p className="py-4 text-center text-sm text-muted-foreground">System off</p>
          ) : (
            setpointsForMode[status.mode].map((kind) => (
              <SetpointStepper key={kind} id={id} kind={kind} state={status.occupancy} />
            ))
          )}
        </CardContent>
      )}

      {status && (
        <CardFooter>
          <ModeToggle id={id} mode={status.mode} />
        </CardFooter>
      )}
    </Card>
  )
}

export default ThermostatCard
