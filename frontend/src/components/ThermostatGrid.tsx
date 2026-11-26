import ThermostatCard from '@/components/ThermostatCard'

type ThermostatGridProps = {
  ids: string[]
}

// Phones: one full-height card per screen, scroll-snapped. md and up: a grid.
function ThermostatGrid({ ids }: ThermostatGridProps) {
  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto px-3 pb-[env(safe-area-inset-bottom)] md:grid md:snap-none md:auto-rows-min md:grid-cols-2 md:gap-4 md:px-6 md:pb-6 lg:grid-cols-3">
      {ids.map((id) => (
        <section key={id} className="h-full snap-start py-1.5 md:h-[36rem] md:py-0">
          <ThermostatCard id={id} />
        </section>
      ))}
    </div>
  )
}

export default ThermostatGrid
