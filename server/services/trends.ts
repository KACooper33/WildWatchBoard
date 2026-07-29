import type {
  InvasiveSpeciesConfig,
  ObservationWindowDays,
  TrendPeriodMetrics,
  TrendsDto,
} from '../../shared/types.ts'
import {
  queryMonthlySeries,
  queryPeriodMetrics,
  queryYearlySeries,
} from '../db/analytics.ts'
import { isoDateDaysAgo, isoDateToday } from '../db/sqlite.ts'
import { ARCHIVE_YEARS_BACK, ensureRegionCoverage } from './archive.ts'
import { getRegion } from './geoFilter.ts'
import { parseObservationWindow } from './timeWindow.ts'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function emptyPeriod(): TrendPeriodMetrics {
  return {
    observationCount: 0,
    uniqueSpecies: 0,
    observerCount: 0,
    researchGradePercent: 0,
    invasiveCount: 0,
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
  const invasiveTaxonIds = loadInvasives().map((s) => s.taxonId)

  const backfillStatus = await ensureRegionCoverage(region.id, ARCHIVE_YEARS_BACK)

  const currentEnd = isoDateToday()
  const currentStart = isoDateDaysAgo(windowDays)
  const current = queryPeriodMetrics(
    region.id,
    currentStart,
    currentEnd,
    invasiveTaxonIds,
  )

  const now = new Date()
  const endYear = now.getUTCFullYear()
  const startYear = endYear - ARCHIVE_YEARS_BACK
  const yearly = queryYearlySeries(region.id, startYear, endYear)
  const monthly = queryMonthlySeries(region.id, endYear)

  if (!priorAvailable) {
    return {
      region: region.id,
      windowDays,
      cachedAt: new Date().toISOString(),
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
      yearly,
      monthly,
      backfillStatus,
    }
  }

  const priorEndDate = new Date(`${currentStart}T00:00:00.000Z`)
  priorEndDate.setUTCDate(priorEndDate.getUTCDate() - 1)
  const priorEnd = priorEndDate.toISOString().slice(0, 10)
  const priorStart = isoDateDaysAgo(windowDays * 2)

  const previous = queryPeriodMetrics(
    region.id,
    priorStart,
    priorEnd,
    invasiveTaxonIds,
  )

  return {
    region: region.id,
    windowDays,
    cachedAt: new Date().toISOString(),
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
    yearly,
    monthly,
    backfillStatus,
  }
}
