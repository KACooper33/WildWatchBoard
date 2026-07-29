import type { ObservationWindowDays } from '../../shared/types.ts'
import { getRegion } from './geoFilter.ts'

export const OBSERVATION_WINDOWS = [7, 30, 90] as const

/** Extra pages for longer windows so 90d samples stay useful. */
const LONG_WINDOW_MAX_PAGES = 8

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
  throw new Error(`Invalid time window: ${value}. Use 7, 30, or 90.`)
}

/** Parse `taxa=Aves,Plantae` or repeated `taxa=` query values. */
export function parseTaxaFilter(raw: unknown): string[] {
  const values: string[] = []
  if (typeof raw === 'string' && raw.trim()) {
    values.push(...raw.split(','))
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && item.trim()) values.push(...item.split(','))
    }
  }
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
}

export function observationQueryOptions(regionId: string | undefined, windowDays: number) {
  const region = getRegion(regionId)
  const maxPages =
    windowDays >= 90 ? Math.max(region.maxPages, LONG_WINDOW_MAX_PAGES) : region.maxPages
  return { windowDays, maxPages }
}
