import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useThermostatStatus } from '@/hooks/useThermostatStatus'
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertDiamondIcon,
  ArrowUpDownIcon,
  FireIcon,
  PowerIcon,
  SnowflakeIcon,
} from "@hugeicons/core-free-icons"
import type { components } from '@/api/schema'

type ThermostatCardProps = {
  id: string
}

type SystemMode = components["schemas"]["SystemMode"]

const modeIconMap: Record<SystemMode, typeof SnowflakeIcon> = {
  auto: ArrowUpDownIcon,
  cool: SnowflakeIcon,
  heat: FireIcon,
  "emergency-heat": AlertDiamondIcon,
  off: PowerIcon
}

function ThermostatCard({ id }: ThermostatCardProps) {
  const { status, error } = useThermostatStatus(id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{id}</CardTitle>
        <CardDescription className="capitalize">{status?.occupancy}</CardDescription>
      </CardHeader>

      <CardContent>
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : status ? (
            <div className="flex items-baseline justify-between">
              <span className="text-5xl font-light">{status.temperature.toFixed(0)}°</span>
              <span className="text-muted-foreground">{status.humidity.toFixed(0)}% RH</span>
            </div>
        ) : (
          <p className="text-muted-foreground">Loading…</p>
        )}
      </CardContent>

      {status && (
      <CardFooter className="justify-between">
        <HugeiconsIcon icon={modeIconMap[status.mode]} size={40} color="currentColor" strokeWidth={1.5} />
        <span className="text-muted-foreground">
          Cool {status.coolSetpoint}° | Heat {status.heatSetpoint}°
        </span>
      </CardFooter>
      )}
    </Card>
  )
}

export default ThermostatCard
