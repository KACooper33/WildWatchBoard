import type { ObservationWindowDays } from '../../shared/types.ts'
import { getRegion } from './geoFilter.ts'

export const OBSERVATION_WINDOWS = [7, 30, 360] as const

const LONG_WINDOW_MAX_PAGES = 10

export function isObservationWindow(value: number): value is ObservationWindowDays {
  return (OBSERVATION_WINDOWS as readonly number[]).includes(value)
}

export function parseObservationWindow(value: unknown): ObservationWindowDays {
  const n =
    typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : typeof value === 'number'
        ? value
        : 30

  if (isObservationWindow(n)) return n
  throw new Error(`Invalid time window: ${value}. Use 7, 30, or 360.`)
}

export function observationQueryOptions(regionId: string | undefined, windowDays: number) {
  const region = getRegion(regionId)
  const maxPages =
    windowDays >= 360 ? Math.max(region.maxPages, LONG_WINDOW_MAX_PAGES) : region.maxPages
  return { windowDays, maxPages }
}
