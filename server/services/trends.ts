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
import { ARCHIVE_YEARS_BACK, scheduleRegionBackfill } from './archive.ts'
import { getRegion } from './geoFilter.ts'
import { parseObservationWindow, parseTaxaFilter } from './timeWindow.ts'
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
  taxaRaw: unknown = undefined,
): Promise<TrendsDto> {
  const windowDays = parseObservationWindow(windowDaysRaw) as ObservationWindowDays
  const appliedTaxa = parseTaxaFilter(taxaRaw)
  const region = getRegion(regionId)
  const priorAvailable = windowDays <= MAX_TREND_COMPARE_WINDOW
  const invasiveTaxonIds = loadInvasives().map((s) => s.taxonId)

  const backfillStatus = scheduleRegionBackfill(region.id, ARCHIVE_YEARS_BACK)

  const currentEnd = isoDateToday()
  const currentStart = isoDateDaysAgo(windowDays)
  const current = queryPeriodMetrics(
    region.id,
    currentStart,
    currentEnd,
    invasiveTaxonIds,
    appliedTaxa,
  )

  const now = new Date()
  const endYear = now.getUTCFullYear()
  const startYear = endYear - ARCHIVE_YEARS_BACK
  const yearlyAll = queryYearlySeries(region.id, startYear, endYear, [])
  const yearly =
    appliedTaxa.length === 0
      ? yearlyAll
      : queryYearlySeries(region.id, startYear, endYear, appliedTaxa)
  const yearlyScaleMax = Math.max(1, ...yearlyAll.map((y) => y.observationCount))
  const monthly = queryMonthlySeries(region.id, endYear, appliedTaxa)

  if (!priorAvailable) {
    return {
      region: region.id,
      windowDays,
      cachedAt: new Date().toISOString(),
      priorAvailable: false,
      appliedTaxa,
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
      yearlyScaleMax,
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
    appliedTaxa,
  )

  return {
    region: region.id,
    windowDays,
    cachedAt: new Date().toISOString(),
    priorAvailable: true,
    appliedTaxa,
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
    yearlyScaleMax,
    monthly,
    backfillStatus,
  }
}
