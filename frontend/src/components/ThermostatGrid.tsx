import ThermostatCard from '@/components/ThermostatCard'

type ThermostatGridProps = {
  ids: string[]
}

function ThermostatGrid({ ids }: ThermostatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => (
        <ThermostatCard key={id} id={id} />
      ))}
    </div>
  )
}

export default ThermostatGrid
