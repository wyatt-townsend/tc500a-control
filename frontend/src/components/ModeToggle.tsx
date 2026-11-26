import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { modeOrder, modeStyles } from '@/lib/display'
import type { SystemMode } from '@/api/client'
import { useSetMode } from '@/hooks/useThermostatStatus'

type ModeToggleProps = {
  id: string
  mode: SystemMode
}

function ModeToggle({ id, mode }: ModeToggleProps) {
  const setMode = useSetMode(id)

  // While the write is in flight, show the mode the user picked.
  const shown = (setMode.isPending && setMode.variables?.body?.mode) || mode

  return (
    <ToggleGroup
      aria-label="System mode"
      className="w-full"
      spacing={1}
      value={[shown]}
      disabled={setMode.isPending}
      onValueChange={(value) => {
        // Base UI groups always pass an array; it's empty when the pressed item is tapped again.
        const next = value[0] as SystemMode | undefined
        if (!next || next === mode) return

        setMode.mutate({ params: { path: { thermostat_id: id } }, body: { mode: next } })
      }}
    >
      {modeOrder.map((value) => {
        const style = modeStyles[value]

        return (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={style.label}
            className={cn(
              'h-16 min-w-0 flex-1 flex-col gap-1 rounded-xl text-[0.625rem] text-muted-foreground',
              style.pressed,
            )}
          >
            <HugeiconsIcon icon={style.icon} size={22} strokeWidth={1.5} />
            {style.short}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export default ModeToggle
