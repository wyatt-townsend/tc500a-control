import { useEffect, useState } from 'react'
import { api } from './api/client'
import ThermostatGrid from '@/components/ThermostatGrid'

function App() {
  const [ids, setIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    api.GET('/api/thermostats').then(({ data, response }) => {
      if (ignore) return

      if (data) {
        setIds(data.thermostats)
      } else {
        setError(`Request failed with status ${response.status}`)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <main>
      <h1>Thermostats</h1>
      {error ? <p>{error}</p> : <ThermostatGrid ids={ids} />}
    </main>
  )
}

export default App
