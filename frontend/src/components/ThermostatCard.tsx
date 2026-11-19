import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useThermostatStatus } from '@/hooks/useThermostatStatus'

type ThermostatCardProps = {
  id: string
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
          <span>Heat {status.heatSetpoint}°</span>
          <span>Cool {status.coolSetpoint}°</span>
        </CardFooter>
      )}
    </Card>
  )
}

export default ThermostatCard
