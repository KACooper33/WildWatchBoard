import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  InvasiveSpeciesAlert,
  InvasiveSpeciesConfig,
  InvasivesDto,
  ObservationDto,
  ObservationWindowDays,
} from '../../shared/types.ts'
import { isoDateDaysAgo } from '../db/sqlite.ts'
import {
  getObservationsForDateRange,
  getObservationsForRegion,
} from './inaturalist.ts'
import {
  observationQueryOptions,
  parseObservationWindow,
} from './timeWindow.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

type TargetSpeciesFile = {
  invasives: InvasiveSpeciesConfig[]
}

function loadTargetSpecies(): InvasiveSpeciesConfig[] {
  const candidates = [
    join(process.cwd(), 'server', 'config', 'target_species.json'),
    join(__dirname, '..', 'config', 'target_species.json'),
  ]

  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw) as TargetSpeciesFile
      return parsed.invasives ?? []
    } catch {
      // try next
    }
  }

  throw new Error('target_species.json not found')
}

function matchesInvasive(obs: ObservationDto, species: InvasiveSpeciesConfig): boolean {
  if (obs.taxonId != null && obs.taxonId === species.taxonId) {
    return true
  }

  const scientific = obs.scientificName?.trim().toLowerCase()
  const target = species.scientificName.trim().toLowerCase()
  if (scientific && (scientific === target || scientific.startsWith(`${target} `))) {
    return true
  }

  const display = obs.displayName.trim().toLowerCase()
  const common = species.commonName.trim().toLowerCase()
  return display === common
}

function latestDate(dates: Array<string | null>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d)).sort()
  return valid.length ? valid[valid.length - 1]! : null
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function buildAlerts(
  targets: InvasiveSpeciesConfig[],
  currentObs: ObservationDto[],
  priorObs: ObservationDto[],
  priorAvailable: boolean,
): InvasiveSpeciesAlert[] {
  const alerts: InvasiveSpeciesAlert[] = targets.map((species) => {
    const hits = currentObs
      .filter((obs) => matchesInvasive(obs, species))
      .sort((a, b) => (b.observedOn || '').localeCompare(a.observedOn || ''))
    const priorHits = priorObs.filter((obs) => matchesInvasive(obs, species))
    const observationCount = hits.length
    const previousObservationCount = priorAvailable ? priorHits.length : 0

    return {
      commonName: species.commonName,
      scientificName: species.scientificName,
      taxonId: species.taxonId,
      observationCount,
      previousObservationCount,
      observationCountPct: priorAvailable
        ? pctChange(observationCount, previousObservationCount)
        : null,
      latestObservedOn: latestDate(hits.map((h) => h.observedOn)),
      observations: hits.slice(0, 8),
    }
  })

  alerts.sort((a, b) => {
    if (b.observationCount !== a.observationCount) {
      return b.observationCount - a.observationCount
    }
    return a.commonName.localeCompare(b.commonName)
  })

  return alerts
}

export async function getInvasivesForRegion(
  regionId?: string,
  windowDaysRaw: unknown = 30,
): Promise<InvasivesDto> {
  const targets = loadTargetSpecies()
  const windowDays = parseObservationWindow(windowDaysRaw) as ObservationWindowDays
  const { maxPages } = observationQueryOptions(regionId, windowDays)

  const currentFetch = await getObservationsForRegion(regionId, {
    windowDays,
    maxPages,
  })

  // Equal page budget for prior window — same fairness rule as trends.
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

  const alerts = buildAlerts(
    targets,
    currentFetch.observations,
    priorFetch.observations,
    true,
  )
  const totalInvasiveObservations = alerts.reduce((sum, a) => sum + a.observationCount, 0)
  const previousTotalInvasiveObservations = alerts.reduce(
    (sum, a) => sum + a.previousObservationCount,
    0,
  )

  return {
    region: currentFetch.region.id,
    windowDays,
    cachedAt: currentFetch.cachedAt,
    priorAvailable: true,
    totalInvasiveObservations,
    previousTotalInvasiveObservations,
    totalInvasiveObservationsPct: pctChange(
      totalInvasiveObservations,
      previousTotalInvasiveObservations,
    ),
    alerts,
  }
}
