import type { MetricsDto, ObservationDto, QualityGrade } from '../../shared/types'

/** Client-side metrics from an observation list (used for taxon drill-in). */
export function computeMetricsFromObservations(
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

export function filterObservationsByTaxa(
  observations: ObservationDto[],
  appliedTaxa: string[],
): ObservationDto[] {
  if (appliedTaxa.length === 0) return observations
  const allowed = new Set(appliedTaxa)
  return observations.filter((obs) => allowed.has(obs.iconicTaxon))
}
