import { Link, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ScheduleEditor from '@/components/ScheduleEditor'
import SetpointStepper from '@/components/SetpointStepper'
import { displayName, occupancyOrder, occupancyStyles } from '@/lib/display'

function SetpointsCard({ id }: { id: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setpoints</CardTitle>
        <CardDescription>What the thermostat heats and cools to in each occupancy state.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {occupancyOrder.map((state) => (
          <div key={state} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <span className="text-sm font-medium">{occupancyStyles[state].label}</span>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[0.625rem] tracking-wider text-heat uppercase">Heat</span>
                <SetpointStepper id={id} kind="heat" state={state} size="sm" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.625rem] tracking-wider text-cool uppercase">Cool</span>
                <SetpointStepper id={id} kind="cool" state={state} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SchedulePage() {
  const { id = '' } = useParams()

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-3 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-6">
      <header className="flex h-12 items-center gap-1">
        <Link
          to="/"
          aria-label="Back to thermostats"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-lg' }), '-ml-2 size-11 rounded-full')}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
        </Link>
        <h1 className="text-base font-medium capitalize">{displayName(id)}</h1>
      </header>

      <SetpointsCard id={id} />
      <ScheduleEditor id={id} />
    </div>
  )
}

export default SchedulePage
