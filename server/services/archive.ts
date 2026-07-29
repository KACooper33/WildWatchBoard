import {
  countObservationsInMonth,
  currentYearMonth,
  getCoverageMonth,
  listYearMonths,
  monthDateBounds,
  upsertCoverageMonth,
} from '../db/sqlite.ts'
import { getRegion } from './geoFilter.ts'
import { getObservationsForDateRange } from './inaturalist.ts'
import type { ArchiveBackfillStatus } from '../../shared/types.ts'

export const ARCHIVE_YEARS_BACK = Number(process.env.ARCHIVE_YEARS_BACK || 5)
/** How many missing months to ingest per ensure() call (keeps requests from timing out). */
const MONTHS_PER_CALL = Number(process.env.ARCHIVE_MONTHS_PER_CALL || 3)
/** Extra page budget for historical month chunks. */
const HISTORY_MAX_PAGES = Number(process.env.ARCHIVE_MAX_PAGES || 8)
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000)

const regionLocks = new Map<string, Promise<ArchiveBackfillStatus>>()

export function getBackfillStatus(
  regionId: string,
  yearsBack = ARCHIVE_YEARS_BACK,
): ArchiveBackfillStatus {
  const required = listYearMonths(yearsBack)
  const completeSet = new Set(
    required.filter((ym) => {
      const row = getCoverageMonth(regionId, ym)
      if (!row) return false
      if (ym === currentYearMonth()) return row.status === 'partial' || row.status === 'complete'
      return row.status === 'complete'
    }),
  )
  // Current month counts as "covered" when we have any partial/complete row that is fresh enough
  // for status display; pending = months with no usable coverage yet.
  const pendingMonths = required.filter((ym) => {
    const row = getCoverageMonth(regionId, ym)
    if (!row) return true
    if (ym === currentYearMonth()) return false
    return row.status !== 'complete'
  }).length

  const completeMonths = required.length - pendingMonths

  return {
    yearsBack,
    requiredMonths: required.length,
    completeMonths,
    pendingMonths,
    complete: pendingMonths === 0,
  }
}

function needsIngest(regionId: string, yearMonth: string): boolean {
  const row = getCoverageMonth(regionId, yearMonth)
  const isCurrent = yearMonth === currentYearMonth()

  if (!row) return true
  if (!isCurrent) return row.status !== 'complete'

  const age = Date.now() - Date.parse(row.fetchedAt)
  return Number.isNaN(age) || age > CACHE_TTL_MS
}

async function ingestMonth(regionId: string, yearMonth: string): Promise<void> {
  const region = getRegion(regionId)
  const { startDate, endDate } = monthDateBounds(yearMonth)
  const maxPages = Math.max(region.maxPages, HISTORY_MAX_PAGES)
  const isCurrent = yearMonth === currentYearMonth()

  console.log(
    `[archive] ingest ${regionId} ${yearMonth} (${startDate} → ${endDate}, pages≤${maxPages})`,
  )

  await getObservationsForDateRange(regionId, startDate, endDate, maxPages)
  const observationCount = countObservationsInMonth(regionId, yearMonth)

  upsertCoverageMonth({
    regionId,
    yearMonth,
    status: isCurrent ? 'partial' : 'complete',
    fetchedAt: new Date().toISOString(),
    observationCount,
  })
}

/**
 * Ensure archive coverage for a region. Processes a bounded number of missing
 * months per call so HTTP handlers stay responsive; repeated calls finish the backfill.
 */
export async function ensureRegionCoverage(
  regionId: string | undefined,
  yearsBack = ARCHIVE_YEARS_BACK,
  maxMonthsPerCall = MONTHS_PER_CALL,
): Promise<ArchiveBackfillStatus> {
  const region = getRegion(regionId)
  const lockKey = region.id

  const existing = regionLocks.get(lockKey)
  if (existing) {
    await existing
    return getBackfillStatus(region.id, yearsBack)
  }

  const work = (async () => {
    const required = listYearMonths(yearsBack)
    const gaps = required.filter((ym) => needsIngest(region.id, ym))
    // Prefer newest gaps first so recent windows become useful quickly.
    gaps.reverse()

    const batch = gaps.slice(0, Math.max(1, maxMonthsPerCall))
    for (const yearMonth of batch) {
      try {
        await ingestMonth(region.id, yearMonth)
      } catch (error) {
        console.error(`[archive] failed ${region.id} ${yearMonth}:`, error)
        break
      }
    }

    return getBackfillStatus(region.id, yearsBack)
  })()

  regionLocks.set(lockKey, work)
  try {
    return await work
  } finally {
    regionLocks.delete(lockKey)
  }
}
