import type { MetricsDto, ObservationDto, QualityGrade } from '../../shared/types.ts'
import { queryWindowMetrics } from '../db/analytics.ts'
import { isoDateDaysAgo, isoDateToday } from '../db/sqlite.ts'
import { ARCHIVE_YEARS_BACK, ensureRegionCoverage } from './archive.ts'
import { getRegion } from './geoFilter.ts'
import { parseObservationWindow } from './timeWindow.ts'

/** Kept for tests / fallbacks that still pass in-memory observation arrays. */
export function computeMetrics(
  regionId: string,
  windowDays: number,
  observations: ObservationDto[],
  cachedAt: string | null,
): MetricsDto {
  const qualityGrade: Record<QualityGrade, number> = {
    research: 0,
    needs_id: 0,
    casual: 0,
  }
  const byIconicTaxon: Record<string, number> = {}
  const taxonIds = new Set<number>()
  const observers = new Set<string>()

  for (const obs of observations) {
    qualityGrade[obs.qualityGrade] += 1
    byIconicTaxon[obs.iconicTaxon] = (byIconicTaxon[obs.iconicTaxon] ?? 0) + 1
    if (obs.taxonId != null) taxonIds.add(obs.taxonId)
    if (obs.observerId != null) {
      observers.add(String(obs.observerId))
    } else if (obs.observer) {
      observers.add(obs.observer)
    }
  }

  const observationCount = observations.length
  const researchGradePercent =
    observationCount === 0
      ? 0
      : Math.round((qualityGrade.research / observationCount) * 1000) / 10

  return {
    region: regionId,
    windowDays,
    observationCount,
    uniqueSpecies: taxonIds.size,
    observerCount: observers.size,
    researchGradePercent,
    qualityGrade,
    byIconicTaxon,
    cachedAt,
  }
}

export async function getMetricsForRegion(
  regionId: string | undefined,
  windowDaysRaw: unknown = 30,
): Promise<MetricsDto> {
  const windowDays = parseObservationWindow(windowDaysRaw)
  const region = getRegion(regionId)
  const backfillStatus = await ensureRegionCoverage(region.id, ARCHIVE_YEARS_BACK)
  const endDate = isoDateToday()
  const startDate = isoDateDaysAgo(windowDays)
  const metrics = queryWindowMetrics(
    region.id,
    windowDays,
    startDate,
    endDate,
    [],
    new Date().toISOString(),
  )
  return { ...metrics, backfillStatus }
}
