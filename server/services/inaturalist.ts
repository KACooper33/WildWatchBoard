import type { ObservationDto } from '../../shared/types.ts'
import { getRegion, isPointInRegion, type RegionConfig } from './geoFilter.ts'
import {
  getFetchMeta,
  isoDateDaysAgo,
  isoDateToday,
  loadFetchResult,
  queryObservationsByDateRange,
  saveFetchResult,
  upsertFetchMeta,
  upsertObservations,
} from '../db/sqlite.ts'

const INAT_BASE = 'https://api.inaturalist.org/v1/observations'
const USER_AGENT =
  process.env.INAT_USER_AGENT ||
  'WildWatchBoard/0.1 (https://github.com; community biodiversity dashboard)'

const DEFAULT_CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000)
const PAGE_DELAY_MS = 1100 // stay under ~60 req/min

interface CacheEntry<T> {
  expiresAt: number
  value: T
  cachedAt: string
}

const observationCache = new Map<string, CacheEntry<ObservationDto[]>>()
const inflight = new Map<string, Promise<ObservationDto[]>>()

interface InatPhoto {
  url?: string
  square_url?: string
}

interface InatTaxon {
  id?: number
  name?: string
  preferred_common_name?: string
  iconic_taxon_name?: string
}

interface InatUser {
  id?: number
  login?: string
  name?: string
}

interface InatObservation {
  id: number
  quality_grade?: string
  obscured?: boolean
  public_positional_accuracy?: number | null
  location?: string | null
  geojson?: { coordinates?: number[] } | null
  observed_on?: string | null
  time_observed_at?: string | null
  photos?: InatPhoto[]
  taxon?: InatTaxon | null
  user?: InatUser | null
}

interface InatResponse {
  results?: InatObservation[]
  total_results?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseCoords(raw: InatObservation): { lat: number | null; lng: number | null } {
  const fromGeo = raw.geojson?.coordinates
  if (Array.isArray(fromGeo) && fromGeo.length >= 2) {
    const lng = Number(fromGeo[0])
    const lat = Number(fromGeo[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
  }

  if (typeof raw.location === 'string' && raw.location.includes(',')) {
    const [latStr, lngStr] = raw.location.split(',')
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
  }

  return { lat: null, lng: null }
}

function normalizeQuality(grade?: string): ObservationDto['qualityGrade'] {
  if (grade === 'research' || grade === 'needs_id' || grade === 'casual') {
    return grade
  }
  return 'casual'
}

function thumbnailFromPhotos(photos?: InatPhoto[]): string | null {
  const first = photos?.[0]
  if (!first) return null
  const url = first.square_url || first.url
  if (!url) return null
  return url.replace('/square.', '/square.').replace('http://', 'https://')
}

function normalizeIconic(name?: string): string {
  if (!name) return 'Other'
  const known = [
    'Aves',
    'Mammalia',
    'Reptilia',
    'Amphibia',
    'Plantae',
    'Insecta',
    'Fungi',
  ]
  return known.includes(name) ? name : 'Other'
}

export function transformObservation(raw: InatObservation): ObservationDto {
  const { lat, lng } = parseCoords(raw)
  const scientificName = raw.taxon?.name ?? null
  const displayName =
    raw.taxon?.preferred_common_name || scientificName || 'Unknown'

  return {
    id: raw.id,
    lat,
    lng,
    obscured: Boolean(raw.obscured),
    publicPositionalAccuracy: raw.public_positional_accuracy ?? null,
    displayName,
    scientificName,
    taxonId: raw.taxon?.id ?? null,
    iconicTaxon: normalizeIconic(raw.taxon?.iconic_taxon_name),
    qualityGrade: normalizeQuality(raw.quality_grade),
    observer: raw.user?.login || raw.user?.name || 'Unknown',
    observerId: raw.user?.id ?? null,
    observedOn: raw.observed_on || raw.time_observed_at || null,
    thumbnailUrl: thumbnailFromPhotos(raw.photos),
  }
}

async function fetchPage(
  region: RegionConfig,
  page: number,
  d1: string,
  d2?: string,
): Promise<InatObservation[]> {
  const params = new URLSearchParams({
    nelat: String(region.bbox.nelat),
    nelng: String(region.bbox.nelng),
    swlat: String(region.bbox.swlat),
    swlng: String(region.bbox.swlng),
    d1,
    per_page: String(region.perPage),
    page: String(page),
    order: 'desc',
    order_by: 'observed_on',
  })
  if (d2) params.set('d2', d2)

  const response = await fetch(`${INAT_BASE}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`iNaturalist API error ${response.status}`)
  }

  const data = (await response.json()) as InatResponse
  return data.results ?? []
}

async function fetchAndFilterRange(
  region: RegionConfig,
  d1: string,
  d2: string | undefined,
  maxPages: number,
): Promise<ObservationDto[]> {
  const all: ObservationDto[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    if (page > 1) {
      await sleep(PAGE_DELAY_MS)
    }

    const results = await fetchPage(region, page, d1, d2)
    if (results.length === 0) break

    for (const raw of results) {
      const dto = transformObservation(raw)
      if (dto.lat != null && dto.lng != null) {
        if (!isPointInRegion(region, dto.lat, dto.lng)) continue
      }
      all.push(dto)
    }

    if (results.length < region.perPage) break
  }

  return all
}

async function fetchAndFilter(
  region: RegionConfig,
  windowDays: number,
  maxPages: number,
): Promise<ObservationDto[]> {
  return fetchAndFilterRange(region, isoDateDaysAgo(windowDays), isoDateToday(), maxPages)
}

function persistFetch(
  cacheKey: string,
  regionId: string,
  windowDays: number,
  maxPages: number,
  observations: ObservationDto[],
): string {
  const fetchedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + DEFAULT_CACHE_TTL_MS).toISOString()
  upsertObservations(regionId, observations)
  upsertFetchMeta({
    cacheKey,
    regionId,
    windowDays,
    maxPages,
    fetchedAt,
    expiresAt,
  })
  saveFetchResult(cacheKey, observations, fetchedAt, expiresAt)
  return fetchedAt
}

export interface ObservationQueryOptions {
  windowDays?: number
  maxPages?: number
}

export async function getObservationsForRegion(
  regionId?: string,
  options: ObservationQueryOptions = {},
): Promise<{
  observations: ObservationDto[]
  cachedAt: string
  region: RegionConfig
  windowDays: number
}> {
  const region = getRegion(regionId)
  const windowDays = options.windowDays ?? region.windowDays
  const maxPages = options.maxPages ?? region.maxPages
  const cacheKey = `${region.id}:${windowDays}:${maxPages}`
  const now = Date.now()
  const hit = observationCache.get(cacheKey)

  if (hit && hit.expiresAt > now) {
    return { observations: hit.value, cachedAt: hit.cachedAt, region, windowDays }
  }

  const stored = loadFetchResult(cacheKey)
  const meta = getFetchMeta(cacheKey)
  if (
    stored &&
    meta &&
    Date.parse(stored.expiresAt) > now &&
    Date.parse(meta.expiresAt) > now
  ) {
    observationCache.set(cacheKey, {
      value: stored.observations,
      cachedAt: stored.fetchedAt,
      expiresAt: Date.parse(stored.expiresAt),
    })
    return {
      observations: stored.observations,
      cachedAt: stored.fetchedAt,
      region,
      windowDays,
    }
  }

  let pending = inflight.get(cacheKey)
  if (!pending) {
    pending = fetchAndFilter(region, windowDays, maxPages)
      .then((observations) => {
        persistFetch(cacheKey, region.id, windowDays, maxPages, observations)
        return observations
      })
      .finally(() => {
        inflight.delete(cacheKey)
      })
    inflight.set(cacheKey, pending)
  }

  const observations = await pending
  const cachedAt = new Date().toISOString()
  observationCache.set(cacheKey, {
    value: observations,
    expiresAt: now + DEFAULT_CACHE_TTL_MS,
    cachedAt,
  })

  return { observations, cachedAt, region, windowDays }
}

/**
 * Fetch a closed date range with the same page budget as other dashboard pulls.
 * Used for fair current-vs-prior trend comparisons.
 */
export async function getObservationsForDateRange(
  regionId: string | undefined,
  startDate: string,
  endDate: string,
  maxPages?: number,
): Promise<{ observations: ObservationDto[]; cachedAt: string; region: RegionConfig }> {
  const region = getRegion(regionId)
  const pages = maxPages ?? region.maxPages
  const cacheKey = `${region.id}:range:${startDate}:${endDate}:${pages}`
  const now = Date.now()
  const hit = observationCache.get(cacheKey)

  if (hit && hit.expiresAt > now) {
    return { observations: hit.value, cachedAt: hit.cachedAt, region }
  }

  const stored = loadFetchResult(cacheKey)
  if (stored && Date.parse(stored.expiresAt) > now) {
    observationCache.set(cacheKey, {
      value: stored.observations,
      cachedAt: stored.fetchedAt,
      expiresAt: Date.parse(stored.expiresAt),
    })
    return { observations: stored.observations, cachedAt: stored.fetchedAt, region }
  }

  let pending = inflight.get(cacheKey)
  if (!pending) {
    pending = fetchAndFilterRange(region, startDate, endDate, pages)
      .then((observations) => {
        persistFetch(cacheKey, region.id, 0, pages, observations)
        return observations
      })
      .finally(() => {
        inflight.delete(cacheKey)
      })
    inflight.set(cacheKey, pending)
  }

  const observations = await pending
  const cachedAt = new Date().toISOString()
  observationCache.set(cacheKey, {
    value: observations,
    expiresAt: now + DEFAULT_CACHE_TTL_MS,
    cachedAt,
  })

  return { observations, cachedAt, region }
}

export function getCacheTtlMs(): number {
  return DEFAULT_CACHE_TTL_MS
}

export function getObservationsInRange(
  regionId: string,
  startDate: string,
  endDate: string,
): ObservationDto[] {
  return queryObservationsByDateRange(regionId, startDate, endDate)
}
