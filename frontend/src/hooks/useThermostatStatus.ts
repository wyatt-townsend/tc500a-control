import { useQueryClient } from '@tanstack/react-query'
import {
  $api,
  errorMessage,
  type OccupancyState,
  type SystemMode,
} from '@/api/client'
import { toast } from '@/components/ui/toast'

export type SetpointKind = 'heat' | 'cool'

export type ThermostatStatus = {
  temperature: number
  humidity: number
  mode: SystemMode
  occupancy: OccupancyState
}

// openapi-react-query keys each query as [method, path, init], so building `init`
// the same way everywhere lets mutations update the exact cached query.
function device(id: string) {
  return { params: { path: { thermostat_id: id } } }
}

function setpointPath(kind: SetpointKind) {
  return `/api/thermostats/{thermostat_id}/setpoints/${kind}/{state}` as const
}

function setpointInit(id: string, state: OccupancyState) {
  return { params: { path: { thermostat_id: id, state } } }
}

function notifyError(title: string) {
  return (error: unknown) => {
    toast.add({ title, description: errorMessage(error), type: 'error' })
  }
}

export function useThermostatStatus(id: string) {
  const temperature = $api.useQuery('get', '/api/thermostats/{thermostat_id}/temperature', device(id))
  const humidity = $api.useQuery('get', '/api/thermostats/{thermostat_id}/humidity', device(id))
  const mode = $api.useQuery('get', '/api/thermostats/{thermostat_id}/mode', device(id))
  const occupancy = $api.useQuery('get', '/api/thermostats/{thermostat_id}/occupancy', device(id))

  const status: ThermostatStatus | null =
    temperature.data && humidity.data && mode.data && occupancy.data
      ? {
          temperature: temperature.data.temperature,
          humidity: humidity.data.humidity,
          mode: mode.data.mode,
          occupancy: occupancy.data.occupancy,
        }
      : null

  const failed = [temperature, humidity, mode, occupancy].find((q) => q.error)

  return { status, error: failed ? errorMessage(failed.error) : null }
}

export function useSetMode(id: string) {
  const queryClient = useQueryClient()

  return $api.useMutation('put', '/api/thermostats/{thermostat_id}/mode', {
    // The PUT response is the mode read back from the device, so cache it directly.
    onSuccess: (data) => {
      queryClient.setQueryData(['get', '/api/thermostats/{thermostat_id}/mode', device(id)], data)
    },
    onError: notifyError('Could not change mode'),
  })
}

// Stored setpoint for one occupancy state. Pass `state` as undefined to wait for it.
export function useSetpoint(id: string, kind: SetpointKind, state: OccupancyState | undefined) {
  return $api.useQuery('get', setpointPath(kind), setpointInit(id, state ?? 'occupied'), {
    enabled: state !== undefined,
  })
}

export function useSetSetpoint(id: string, kind: SetpointKind) {
  const queryClient = useQueryClient()

  return $api.useMutation('put', setpointPath(kind), {
    onSuccess: (data, variables) => {
      const { state } = variables.params.path
      queryClient.setQueryData(['get', setpointPath(kind), setpointInit(id, state)], data)
    },
    onError: notifyError(`Could not change ${kind} setpoint`),
  })
}

// Not polled: it only changes when edited, and polling would refresh it mid-edit.
export function useSchedule(id: string) {
  return $api.useQuery('get', '/api/thermostats/{thermostat_id}/schedule', device(id), {
    refetchInterval: false,
  })
}

export function useSaveSchedule(id: string) {
  const queryClient = useQueryClient()

  return $api.useMutation('put', '/api/thermostats/{thermostat_id}/schedule', {
    onSuccess: (data) => {
      queryClient.setQueryData(['get', '/api/thermostats/{thermostat_id}/schedule', device(id)], data)
      toast.add({ title: 'Schedule saved', type: 'success' })
    },
    onError: notifyError('Could not save schedule'),
  })
}
