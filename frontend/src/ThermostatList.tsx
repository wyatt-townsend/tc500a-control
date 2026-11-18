import { useState } from 'react'

type ThermostatListProps = {
  ids: string[]
}

function ThermostatList({ ids }: ThermostatListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => setSelectedId(id)}>
              {id}
            </button>
          </li>
        ))}
      </ul>
      <p>Selected: {selectedId ?? 'none'}</p>
    </>
  )
}

export default ThermostatList
