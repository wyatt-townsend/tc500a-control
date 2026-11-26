import {
  AlertDiamondIcon,
  ArrowUpDownIcon,
  FireIcon,
  PowerIcon,
  SnowflakeIcon,
} from '@hugeicons/core-free-icons'
import type { OccupancyState, SystemMode } from '@/api/client'

type ModeStyle = {
  label: string
  short: string
  icon: typeof SnowflakeIcon
  // Full class strings so Tailwind can find them when scanning the source.
  pressed: string
  tint: string
}

export const modeStyles: Record<SystemMode, ModeStyle> = {
  off: {
    label: 'Off',
    short: 'Off',
    icon: PowerIcon,
    pressed: 'aria-pressed:bg-muted aria-pressed:text-foreground',
    tint: 'from-muted/40',
  },
  heat: {
    label: 'Heat',
    short: 'Heat',
    icon: FireIcon,
    pressed: 'aria-pressed:bg-heat/15 aria-pressed:text-heat',
    tint: 'from-heat/20 ring-heat/25',
  },
  cool: {
    label: 'Cool',
    short: 'Cool',
    icon: SnowflakeIcon,
    pressed: 'aria-pressed:bg-cool/15 aria-pressed:text-cool',
    tint: 'from-cool/20 ring-cool/25',
  },
  auto: {
    label: 'Auto',
    short: 'Auto',
    icon: ArrowUpDownIcon,
    pressed: 'aria-pressed:bg-auto/15 aria-pressed:text-auto',
    tint: 'from-auto/20 ring-auto/25',
  },
  'emergency-heat': {
    label: 'Emergency heat',
    short: 'Em. heat',
    icon: AlertDiamondIcon,
    pressed: 'aria-pressed:bg-emergency/15 aria-pressed:text-emergency',
    tint: 'from-emergency/20 ring-emergency/25',
  },
}

export const modeOrder: SystemMode[] = ['off', 'heat', 'cool', 'auto', 'emergency-heat']

export const occupancyStyles: Record<OccupancyState, { label: string; bar: string }> = {
  occupied: { label: 'Occupied', bar: 'bg-heat/70' },
  standby: { label: 'Standby', bar: 'bg-auto/60' },
  unoccupied: { label: 'Unoccupied', bar: 'bg-muted-foreground/25' },
}

export const occupancyOrder: OccupancyState[] = ['occupied', 'standby', 'unoccupied']

// "conference-room" -> "conference room" (pair with the `capitalize` class)
export function displayName(id: string) {
  return id.replaceAll('-', ' ')
}

// 72 -> "72", 72.5 -> "72.5", 71.99999 -> "72"
export function formatTemp(value: number) {
  return String(Number(value.toFixed(1)))
}
