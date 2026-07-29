import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ObservationDto, QualityGrade } from '../../shared/types.ts'

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'wildwatchboard.sqlite')

let db: Database.Database | null = null

export function getDbPath(): string {
  return process.env.SQLITE_PATH || DEFAULT_DB_PATH
}

export function getDb(): Database.Database {
  if (db) return db

  const path = getDbPath()
  mkdirSync(dirname(path), { recursive: true })
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER NOT NULL,
      region_id TEXT NOT NULL,
      lat REAL,
      lng REAL,
      obscured INTEGER NOT NULL DEFAULT 0,
      public_positional_accuracy REAL,
      display_name TEXT NOT NULL,
      scientific_name TEXT,
      taxon_id INTEGER,
      iconic_taxon TEXT NOT NULL,
      quality_grade TEXT NOT NULL,
      observer TEXT NOT NULL,
      observer_id INTEGER,
      observed_on TEXT,
      thumbnail_url TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (region_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_observations_region_date
      ON observations (region_id, observed_on);

    CREATE INDEX IF NOT EXISTS idx_observations_region_taxon_date
      ON observations (region_id, iconic_taxon, observed_on);

    CREATE INDEX IF NOT EXISTS idx_observations_region_observer
      ON observations (region_id, observer_id);

    CREATE INDEX IF NOT EXISTS idx_observations_region_taxon_id
      ON observations (region_id, taxon_id);

    CREATE TABLE IF NOT EXISTS fetch_meta (
      cache_key TEXT PRIMARY KEY,
      region_id TEXT NOT NULL,
      window_days INTEGER NOT NULL,
      max_pages INTEGER NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fetch_results (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coverage_months (
      region_id TEXT NOT NULL,
      year_month TEXT NOT NULL,
      status TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      observation_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (region_id, year_month)
    );

    CREATE INDEX IF NOT EXISTS idx_coverage_region_status
      ON coverage_months (region_id, status);
  `)
}

export interface FetchMeta {
  cacheKey: string
  regionId: string
  windowDays: number
  maxPages: number
  fetchedAt: string
  expiresAt: string
}

export function getFetchMeta(cacheKey: string): FetchMeta | null {
  const row = getDb()
    .prepare(
      `SELECT cache_key as cacheKey, region_id as regionId, window_days as windowDays,
              max_pages as maxPages, fetched_at as fetchedAt, expires_at as expiresAt
       FROM fetch_meta WHERE cache_key = ?`,
    )
    .get(cacheKey) as FetchMeta | undefined
  return row ?? null
}

export function upsertFetchMeta(meta: FetchMeta): void {
  getDb()
    .prepare(
      `INSERT INTO fetch_meta (cache_key, region_id, window_days, max_pages, fetched_at, expires_at)
       VALUES (@cacheKey, @regionId, @windowDays, @maxPages, @fetchedAt, @expiresAt)
       ON CONFLICT(cache_key) DO UPDATE SET
         region_id = excluded.region_id,
         window_days = excluded.window_days,
         max_pages = excluded.max_pages,
         fetched_at = excluded.fetched_at,
         expires_at = excluded.expires_at`,
    )
    .run(meta)
}

export function saveFetchResult(
  cacheKey: string,
  observations: ObservationDto[],
  fetchedAt: string,
  expiresAt: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO fetch_results (cache_key, payload, fetched_at, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload = excluded.payload,
         fetched_at = excluded.fetched_at,
         expires_at = excluded.expires_at`,
    )
    .run(cacheKey, JSON.stringify(observations), fetchedAt, expiresAt)
}

export function loadFetchResult(
  cacheKey: string,
): { observations: ObservationDto[]; fetchedAt: string; expiresAt: string } | null {
  const row = getDb()
    .prepare(
      `SELECT payload, fetched_at as fetchedAt, expires_at as expiresAt
       FROM fetch_results WHERE cache_key = ?`,
    )
    .get(cacheKey) as { payload: string; fetchedAt: string; expiresAt: string } | undefined

  if (!row) return null
  try {
    const observations = JSON.parse(row.payload) as ObservationDto[]
    return { observations, fetchedAt: row.fetchedAt, expiresAt: row.expiresAt }
  } catch {
    return null
  }
}

export function upsertObservations(regionId: string, observations: ObservationDto[]): void {
  const updatedAt = new Date().toISOString()
  const stmt = getDb().prepare(`
    INSERT INTO observations (
      id, region_id, lat, lng, obscured, public_positional_accuracy,
      display_name, scientific_name, taxon_id, iconic_taxon, quality_grade,
      observer, observer_id, observed_on, thumbnail_url, updated_at
    ) VALUES (
      @id, @regionId, @lat, @lng, @obscured, @publicPositionalAccuracy,
      @displayName, @scientificName, @taxonId, @iconicTaxon, @qualityGrade,
      @observer, @observerId, @observedOn, @thumbnailUrl, @updatedAt
    )
    ON CONFLICT(region_id, id) DO UPDATE SET
      lat = excluded.lat,
      lng = excluded.lng,
      obscured = excluded.obscured,
      public_positional_accuracy = excluded.public_positional_accuracy,
      display_name = excluded.display_name,
      scientific_name = excluded.scientific_name,
      taxon_id = excluded.taxon_id,
      iconic_taxon = excluded.iconic_taxon,
      quality_grade = excluded.quality_grade,
      observer = excluded.observer,
      observer_id = excluded.observer_id,
      observed_on = excluded.observed_on,
      thumbnail_url = excluded.thumbnail_url,
      updated_at = excluded.updated_at
  `)

  const tx = getDb().transaction((rows: ObservationDto[]) => {
    for (const obs of rows) {
      stmt.run({
        id: obs.id,
        regionId,
        lat: obs.lat,
        lng: obs.lng,
        obscured: obs.obscured ? 1 : 0,
        publicPositionalAccuracy: obs.publicPositionalAccuracy,
        displayName: obs.displayName,
        scientificName: obs.scientificName,
        taxonId: obs.taxonId,
        iconicTaxon: obs.iconicTaxon,
        qualityGrade: obs.qualityGrade,
        observer: obs.observer,
        observerId: obs.observerId,
        observedOn: obs.observedOn,
        thumbnailUrl: obs.thumbnailUrl,
        updatedAt,
      })
    }
  })

  tx(observations)
}

interface ObservationRow {
  id: number
  lat: number | null
  lng: number | null
  obscured: number
  public_positional_accuracy: number | null
  display_name: string
  scientific_name: string | null
  taxon_id: number | null
  iconic_taxon: string
  quality_grade: string
  observer: string
  observer_id: number | null
  observed_on: string | null
  thumbnail_url: string | null
}

function rowToDto(row: ObservationRow): ObservationDto {
  const grade = row.quality_grade
  const qualityGrade: QualityGrade =
    grade === 'research' || grade === 'needs_id' || grade === 'casual' ? grade : 'casual'

  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    obscured: Boolean(row.obscured),
    publicPositionalAccuracy: row.public_positional_accuracy,
    displayName: row.display_name,
    scientificName: row.scientific_name,
    taxonId: row.taxon_id,
    iconicTaxon: row.iconic_taxon,
    qualityGrade,
    observer: row.observer,
    observerId: row.observer_id,
    observedOn: row.observed_on,
    thumbnailUrl: row.thumbnail_url,
  }
}

/** Load observations for a region with observed_on in [startDate, endDate] (inclusive, ISO date strings). */
export function queryObservationsByDateRange(
  regionId: string,
  startDate: string,
  endDate: string,
): ObservationDto[] {
  const rows = getDb()
    .prepare(
      `SELECT id, lat, lng, obscured, public_positional_accuracy, display_name, scientific_name,
              taxon_id, iconic_taxon, quality_grade, observer, observer_id, observed_on, thumbnail_url
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
       ORDER BY observed_on DESC`,
    )
    .all(regionId, startDate, endDate) as ObservationRow[]

  return rows.map(rowToDto)
}

export function isoDateDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export type CoverageStatus = 'complete' | 'partial'

export interface CoverageMonthRow {
  regionId: string
  yearMonth: string
  status: CoverageStatus
  fetchedAt: string
  observationCount: number
}

/** Calendar months from (today - yearsBack) through the current month, inclusive. */
export function listYearMonths(yearsBack: number): string[] {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const start = new Date(
    Date.UTC(now.getUTCFullYear() - yearsBack, now.getUTCMonth(), 1),
  )
  const months: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthDateBounds(yearMonth: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const startDate = `${yearMonth}-01`
  const end = new Date(Date.UTC(year, month, 0))
  const endDate = end.toISOString().slice(0, 10)
  return { startDate, endDate }
}

export function getCoverageMonth(
  regionId: string,
  yearMonth: string,
): CoverageMonthRow | null {
  const row = getDb()
    .prepare(
      `SELECT region_id as regionId, year_month as yearMonth, status,
              fetched_at as fetchedAt, observation_count as observationCount
       FROM coverage_months
       WHERE region_id = ? AND year_month = ?`,
    )
    .get(regionId, yearMonth) as CoverageMonthRow | undefined
  return row ?? null
}

export function listCoverageMonths(regionId: string): CoverageMonthRow[] {
  return getDb()
    .prepare(
      `SELECT region_id as regionId, year_month as yearMonth, status,
              fetched_at as fetchedAt, observation_count as observationCount
       FROM coverage_months
       WHERE region_id = ?
       ORDER BY year_month ASC`,
    )
    .all(regionId) as CoverageMonthRow[]
}

export function upsertCoverageMonth(row: CoverageMonthRow): void {
  getDb()
    .prepare(
      `INSERT INTO coverage_months (
         region_id, year_month, status, fetched_at, observation_count
       ) VALUES (
         @regionId, @yearMonth, @status, @fetchedAt, @observationCount
       )
       ON CONFLICT(region_id, year_month) DO UPDATE SET
         status = excluded.status,
         fetched_at = excluded.fetched_at,
         observation_count = excluded.observation_count`,
    )
    .run(row)
}

export function countObservationsInMonth(regionId: string, yearMonth: string): number {
  const { startDate, endDate } = monthDateBounds(yearMonth)
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as count
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?`,
    )
    .get(regionId, startDate, endDate) as { count: number }
  return row.count
}

/** Load observations for map pins with an optional taxa filter and row cap. */
export function queryObservationsForMap(
  regionId: string,
  startDate: string,
  endDate: string,
  limit = 500,
  taxa: string[] = [],
): ObservationDto[] {
  const params: Array<string | number> = [regionId, startDate, endDate]
  let taxaClause = ''
  if (taxa.length > 0) {
    taxaClause = `AND iconic_taxon IN (${taxa.map(() => '?').join(', ')})`
    params.push(...taxa)
  }
  params.push(limit)

  const rows = getDb()
    .prepare(
      `SELECT id, lat, lng, obscured, public_positional_accuracy, display_name, scientific_name,
              taxon_id, iconic_taxon, quality_grade, observer, observer_id, observed_on, thumbnail_url
       FROM observations
       WHERE region_id = ?
         AND observed_on IS NOT NULL
         AND observed_on >= ?
         AND observed_on <= ?
         ${taxaClause}
       ORDER BY observed_on DESC
       LIMIT ?`,
    )
    .all(...params) as ObservationRow[]

  return rows.map(rowToDto)
}
