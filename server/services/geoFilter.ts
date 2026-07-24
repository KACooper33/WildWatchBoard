import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import regionsConfig from '../config/regions.config.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface RegionConfig {
  id: string
  name: string
  description?: string
  geojsonPath: string
  bbox: {
    nelat: number
    nelng: number
    swlat: number
    swlng: number
  }
  windowDays: number
  maxPages: number
  perPage: number
}

type RegionsFile = {
  regions: Record<string, RegionConfig>
  defaultRegion: string
}

const config = regionsConfig as RegionsFile

const boundaryCache = new Map<string, Feature<Polygon | MultiPolygon>>()

function loadBoundary(region: RegionConfig): Feature<Polygon | MultiPolygon> {
  const cached = boundaryCache.get(region.id)
  if (cached) return cached

  const candidates = [
    join(process.cwd(), 'public', 'data', region.geojsonPath),
    join(__dirname, '..', '..', 'public', 'data', region.geojsonPath),
  ]

  let raw: string | null = null
  for (const path of candidates) {
    try {
      raw = readFileSync(path, 'utf8')
      break
    } catch {
      // try next
    }
  }

  if (!raw) {
    throw new Error(`GeoJSON not found for region ${region.id}: ${region.geojsonPath}`)
  }

  const collection = JSON.parse(raw) as FeatureCollection<Polygon | MultiPolygon>
  const feature = collection.features[0]
  if (!feature?.geometry) {
    throw new Error(`Invalid GeoJSON for region ${region.id}`)
  }

  boundaryCache.set(region.id, feature)
  return feature
}

export function listRegions() {
  return Object.values(config.regions).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }))
}

export function getDefaultRegionId(): string {
  return config.defaultRegion
}

export function getRegion(regionId?: string): RegionConfig {
  const id = regionId || config.defaultRegion
  const region = config.regions[id]
  if (!region) {
    throw new Error(`Unknown region: ${id}`)
  }
  return region
}

export function isPointInRegion(
  region: RegionConfig,
  lat: number | null,
  lng: number | null,
): boolean {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }
  const boundary = loadBoundary(region)
  return booleanPointInPolygon(point([lng, lat]), boundary)
}

export function getRegionBoundary(region: RegionConfig): Feature<Polygon | MultiPolygon> {
  return loadBoundary(region)
}
