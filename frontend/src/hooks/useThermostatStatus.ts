import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { components } from '@/api/schema'

export type ThermostatStatus = {
  temperature: number
  humidity: number
  heatSetpoint: number
  coolSetpoint: number
  occupancy: components['schemas']['OccupancyState']
}

async function fetchStatus(id: string): Promise<ThermostatStatus> {
  const options = { params: { path: { thermostat_id: id } } }

  const [temperature, humidity, heat, cool, occupancy] = await Promise.all([
    api.GET('/api/thermostats/{thermostat_id}/temperature', options),
    api.GET('/api/thermostats/{thermostat_id}/humidity', options),
    api.GET('/api/thermostats/{thermostat_id}/setpoints/heat/effective', options),
    api.GET('/api/thermostats/{thermostat_id}/setpoints/cool/effective', options),
    api.GET('/api/thermostats/{thermostat_id}/occupancy', options),
  ])

  if (!temperature.data || !humidity.data || !heat.data || !cool.data || !occupancy.data) {
    throw new Error('Could not read thermostat')
  }

  return {
    temperature: temperature.data.temperature,
    humidity: humidity.data.humidity,
    heatSetpoint: heat.data.setpoint,
    coolSetpoint: cool.data.setpoint,
    occupancy: occupancy.data.occupancy,
  }
}

export function useThermostatStatus(id: string) {
  const [status, setStatus] = useState<ThermostatStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    fetchStatus(id).then(
      (result) => {
        if (!ignore) setStatus(result)
      },
      (err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : String(err))
      },
    )

    return () => {
      ignore = true
    }
  }, [id])

  return { status, error }
}
