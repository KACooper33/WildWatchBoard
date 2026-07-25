import type {
  ObservationDto,
  ObservationWindowDays,
  TrendPeriodMetrics,
  TrendsDto,
} from '../../shared/types.ts'
import { getRegion } from './geoFilter.ts'
import {
  getObservationsForDateRange,
  getObservationsForRegion,
} from './inaturalist.ts'
import { computeMetrics } from './metrics.ts'
import { isoDateDaysAgo } from '../db/sqlite.ts'
import { observationQueryOptions, parseObservationWindow } from './timeWindow.ts'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { InvasiveSpeciesConfig } from '../../shared/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** All supported windows (7/30/90) get a fair prior comparison. */
const MAX_TREND_COMPARE_WINDOW = 90

function loadInvasives(): InvasiveSpeciesConfig[] {
  const candidates = [
    join(process.cwd(), 'server', 'config', 'target_species.json'),
    join(__dirname, '..', 'config', 'target_species.json'),
  ]
  for (const path of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
        invasives: InvasiveSpeciesConfig[]
      }
      return parsed.invasives ?? []
    } catch {
      // try next
    }
  }
  return []
}

function matchesInvasive(obs: ObservationDto, species: InvasiveSpeciesConfig): boolean {
  if (obs.taxonId != null && obs.taxonId === species.taxonId) return true
  const scientific = obs.scientificName?.trim().toLowerCase()
  const target = species.scientificName.trim().toLowerCase()
  if (scientific && (scientific === target || scientific.startsWith(`${target} `))) {
    return true
  }
  return obs.displayName.trim().toLowerCase() === species.commonName.trim().toLowerCase()
}

function emptyPeriod(): TrendPeriodMetrics {
  return {
    observationCount: 0,
    uniqueSpecies: 0,
    observerCount: 0,
    researchGradePercent: 0,
    invasiveCount: 0,
  }
}

function toPeriodMetrics(
  regionId: string,
  windowDays: number,
  observations: ObservationDto[],
  invasives: InvasiveSpeciesConfig[],
): TrendPeriodMetrics {
  const base = computeMetrics(regionId, windowDays, observations, null)
  const invasiveCount = observations.filter((obs) =>
    invasives.some((species) => matchesInvasive(obs, species)),
  ).length

  return {
    observationCount: base.observationCount,
    uniqueSpecies: base.uniqueSpecies,
    observerCount: base.observerCount,
    researchGradePercent: base.researchGradePercent,
    invasiveCount,
  }
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export async function getTrendsForRegion(
  regionId: string | undefined,
  windowDaysRaw: unknown,
): Promise<TrendsDto> {
  const windowDays = parseObservationWindow(windowDaysRaw) as ObservationWindowDays
  const region = getRegion(regionId)
  const priorAvailable = windowDays <= MAX_TREND_COMPARE_WINDOW
  const maxPages = observationQueryOptions(regionId, windowDays).maxPages
  const invasives = loadInvasives()

  // Current period: same fetch the rest of the dashboard uses for this window.
  const currentFetch = await getObservationsForRegion(regionId, {
    windowDays,
    maxPages,
  })
  const current = toPeriodMetrics(
    region.id,
    windowDays,
    currentFetch.observations,
    invasives,
  )

  if (!priorAvailable) {
    return {
      region: region.id,
      windowDays,
      cachedAt: currentFetch.cachedAt,
      priorAvailable: false,
      current,
      previous: emptyPeriod(),
      deltas: {
        observationCountPct: null,
        uniqueSpeciesPct: null,
        observerCountPct: null,
        researchGradePercentPts: null,
        invasiveCountPct: null,
      },
    }
  }

  // Prior period: separate equal-budget pull for [now-2W, day before current).
  // Avoids newest-first pagination stuffing almost everything into "Now".
  const currentStart = isoDateDaysAgo(windowDays)
  const priorStart = isoDateDaysAgo(windowDays * 2)
  const priorEndDate = new Date(`${currentStart}T00:00:00.000Z`)
  priorEndDate.setUTCDate(priorEndDate.getUTCDate() - 1)
  const priorEnd = priorEndDate.toISOString().slice(0, 10)

  const priorFetch = await getObservationsForDateRange(
    regionId,
    priorStart,
    priorEnd,
    maxPages,
  )
  const previous = toPeriodMetrics(
    region.id,
    windowDays,
    priorFetch.observations,
    invasives,
  )

  return {
    region: region.id,
    windowDays,
    cachedAt: currentFetch.cachedAt,
    priorAvailable: true,
    current,
    previous,
    deltas: {
      observationCountPct: pctChange(current.observationCount, previous.observationCount),
      uniqueSpeciesPct: pctChange(current.uniqueSpecies, previous.uniqueSpecies),
      observerCountPct: pctChange(current.observerCount, previous.observerCount),
      researchGradePercentPts:
        Math.round((current.researchGradePercent - previous.researchGradePercent) * 10) / 10,
      invasiveCountPct: pctChange(current.invasiveCount, previous.invasiveCount),
    },
  }
}
