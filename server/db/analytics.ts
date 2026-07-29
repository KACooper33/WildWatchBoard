import type {
  MetricsDto,
  QualityGrade,
  TrendPeriodMetrics,
  YearlyTrendPoint,
  MonthlyTrendPoint,
} from '../../shared/types.ts'
import { getDb } from './sqlite.ts'

function taxaClause(taxa: string[]): { sql: string; params: string[] } {
  if (taxa.length === 0) return { sql: '', params: [] }
  return {
    sql: `AND iconic_taxon IN (${taxa.map(() => '?').join(', ')})`,
    params: taxa,
  }
}

export function queryWindowMetrics(
  regionId: string,
  windowDays: number,
  startDate: string,
  endDate: string,
  taxa: string[] = [],
  cachedAt: string | null = null,
): MetricsDto {
  const db = getDb()
  const { sql: taxaSql, params: taxaParams } = taxaClause(taxa)
  const baseParams = [regionId, startDate, endDate, ...taxaParams]

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as observationCount,
         COUNT(DISTINCT taxon_id) as uniqueSpecies,
         COUNT(DISTINCT CASE
           WHEN observer_id IS NOT NULL THEN CAST(observer_id AS TEXT)
           ELSE observer
         END) as observerCount,
         SUM(CASE WHEN quality_grade = 'research' THEN 1 ELSE 0 END) as researchCount
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}`,
    )
    .get(...baseParams) as {
    observationCount: number
    uniqueSpecies: number
    observerCount: number
    researchCount: number
  }

  const qualityRows = db
    .prepare(
      `SELECT quality_grade as grade, COUNT(*) as count
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}
       GROUP BY quality_grade`,
    )
    .all(...baseParams) as Array<{ grade: string; count: number }>

  const qualityGrade: Record<QualityGrade, number> = {
    research: 0,
    needs_id: 0,
    casual: 0,
  }
  for (const row of qualityRows) {
    if (row.grade === 'research' || row.grade === 'needs_id' || row.grade === 'casual') {
      qualityGrade[row.grade] = row.count
    }
  }

  const taxonRows = db
    .prepare(
      `SELECT iconic_taxon as taxon, COUNT(*) as count
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}
       GROUP BY iconic_taxon
       ORDER BY count DESC`,
    )
    .all(...baseParams) as Array<{ taxon: string; count: number }>

  const byIconicTaxon: Record<string, number> = {}
  for (const row of taxonRows) {
    byIconicTaxon[row.taxon] = row.count
  }

  const observationCount = totals.observationCount ?? 0
  const researchGradePercent =
    observationCount === 0
      ? 0
      : Math.round(((totals.researchCount ?? 0) / observationCount) * 1000) / 10

  return {
    region: regionId,
    windowDays,
    observationCount,
    uniqueSpecies: totals.uniqueSpecies ?? 0,
    observerCount: totals.observerCount ?? 0,
    researchGradePercent,
    qualityGrade,
    byIconicTaxon,
    cachedAt,
  }
}

export function queryPeriodMetrics(
  regionId: string,
  startDate: string,
  endDate: string,
  invasiveTaxonIds: number[],
  taxa: string[] = [],
): TrendPeriodMetrics {
  const db = getDb()
  const { sql: taxaSql, params: taxaParams } = taxaClause(taxa)
  const baseParams = [regionId, startDate, endDate, ...taxaParams]

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as observationCount,
         COUNT(DISTINCT taxon_id) as uniqueSpecies,
         COUNT(DISTINCT CASE
           WHEN observer_id IS NOT NULL THEN CAST(observer_id AS TEXT)
           ELSE observer
         END) as observerCount,
         SUM(CASE WHEN quality_grade = 'research' THEN 1 ELSE 0 END) as researchCount
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}`,
    )
    .get(...baseParams) as {
    observationCount: number
    uniqueSpecies: number
    observerCount: number
    researchCount: number
  }

  let invasiveCount = 0
  if (invasiveTaxonIds.length > 0) {
    const invasivePlaceholders = invasiveTaxonIds.map(() => '?').join(', ')
    const invasiveRow = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM observations
         WHERE region_id = ?
           AND observed_on IS NOT NULL
           AND observed_on >= ?
           AND observed_on <= ?
           AND taxon_id IN (${invasivePlaceholders})
           ${taxaSql}`,
      )
      .get(regionId, startDate, endDate, ...invasiveTaxonIds, ...taxaParams) as {
      count: number
    }
    invasiveCount = invasiveRow.count ?? 0
  }

  const observationCount = totals.observationCount ?? 0
  const researchGradePercent =
    observationCount === 0
      ? 0
      : Math.round(((totals.researchCount ?? 0) / observationCount) * 1000) / 10

  return {
    observationCount,
    uniqueSpecies: totals.uniqueSpecies ?? 0,
    observerCount: totals.observerCount ?? 0,
    researchGradePercent,
    invasiveCount,
  }
}

export function queryYearlySeries(
  regionId: string,
  startYear: number,
  endYear: number,
  taxa: string[] = [],
): YearlyTrendPoint[] {
  const db = getDb()
  const { sql: taxaSql, params: taxaParams } = taxaClause(taxa)
  const startDate = `${startYear}-01-01`
  const endDate = `${endYear}-12-31`

  const rows = db
    .prepare(
      `SELECT
         CAST(strftime('%Y', observed_on) AS INTEGER) as year,
         COUNT(*) as observationCount,
         COUNT(DISTINCT taxon_id) as uniqueSpecies,
         COUNT(DISTINCT CASE
           WHEN observer_id IS NOT NULL THEN CAST(observer_id AS TEXT)
           ELSE observer
         END) as observerCount
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}
       GROUP BY strftime('%Y', observed_on)
       ORDER BY year ASC`,
    )
    .all(regionId, startDate, endDate, ...taxaParams) as Array<{
    year: number
    observationCount: number
    uniqueSpecies: number
    observerCount: number
  }>

  const byYear = new Map(rows.map((r) => [r.year, r]))
  const currentYear = new Date().getUTCFullYear()
  const series: YearlyTrendPoint[] = []
  for (let year = startYear; year <= endYear; year += 1) {
    const row = byYear.get(year)
    series.push({
      year,
      observationCount: row?.observationCount ?? 0,
      uniqueSpecies: row?.uniqueSpecies ?? 0,
      observerCount: row?.observerCount ?? 0,
      isPartial: year === currentYear,
    })
  }
  return series
}

export function queryMonthlySeries(
  regionId: string,
  year: number,
  taxa: string[] = [],
): MonthlyTrendPoint[] {
  const db = getDb()
  const { sql: taxaSql, params: taxaParams } = taxaClause(taxa)
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const rows = db
    .prepare(
      `SELECT
         strftime('%Y-%m', observed_on) as yearMonth,
         COUNT(*) as observationCount,
         COUNT(DISTINCT taxon_id) as uniqueSpecies,
         COUNT(DISTINCT CASE
           WHEN observer_id IS NOT NULL THEN CAST(observer_id AS TEXT)
           ELSE observer
         END) as observerCount
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaSql}
       GROUP BY strftime('%Y-%m', observed_on)
       ORDER BY yearMonth ASC`,
    )
    .all(regionId, startDate, endDate, ...taxaParams) as Array<{
    yearMonth: string
    observationCount: number
    uniqueSpecies: number
    observerCount: number
  }>

  return rows.map((row) => ({
    yearMonth: row.yearMonth,
    observationCount: row.observationCount,
    uniqueSpecies: row.uniqueSpecies,
    observerCount: row.observerCount,
  }))
}
