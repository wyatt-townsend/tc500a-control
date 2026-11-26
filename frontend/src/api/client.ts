import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
import type { components, paths } from './schema'

const fetchClient = createFetchClient<paths>()

// Typed TanStack Query hooks: $api.useQuery('get', '/api/...'), $api.useMutation('put', ...)
export const $api = createClient(fetchClient)

export type SystemMode = components['schemas']['SystemMode']
export type OccupancyState = components['schemas']['OccupancyState']
export type Transition = components['schemas']['Transition']
export type WeeklySchedule = components['schemas']['WeeklySchedule']

// FastAPI errors arrive as { detail: string } (404), { detail: [{ msg }] } (422),
// or plain text (500, e.g. a BACnet timeout).
export function errorMessage(error: unknown): string {
  if (typeof error === 'string' && error) return error

  if (error && typeof error === 'object' && 'detail' in error) {
    const { detail } = error
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  }

  if (error instanceof Error) return error.message

  return 'Request failed'
}
