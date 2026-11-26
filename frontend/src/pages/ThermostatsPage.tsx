import { $api, errorMessage } from '@/api/client'
import ThermostatGrid from '@/components/ThermostatGrid'

function ThermostatsPage() {
  // The configured list only changes when the backend restarts, so don't poll it.
  const { data, error } = $api.useQuery('get', '/api/thermostats', undefined, {
    refetchInterval: false,
    staleTime: Infinity,
  })

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-12 shrink-0 items-center px-4 pt-[env(safe-area-inset-top)] text-sm font-medium text-muted-foreground md:px-6">
        TC500A Control
      </header>

      <main className="min-h-0 flex-1">
        {error ? (
          <p className="p-4 text-sm text-destructive">{errorMessage(error)}</p>
        ) : (
          <ThermostatGrid ids={data?.thermostats ?? []} />
        )}
      </main>
    </div>
  )
}

export default ThermostatsPage
