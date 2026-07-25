import type {
  InvasivesDto,
  MetricsDto,
  ObservationDto,
  RegionSummary,
} from '../../shared/types'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: string }).error)
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function fetchRegions() {
  return getJson<{ defaultRegion: string; regions: RegionSummary[] }>('/api/regions')
}

export function fetchObservations(regionId: string) {
  return getJson<{
    region: string
    windowDays: number
    cachedAt: string
    count: number
    observations: ObservationDto[]
  }>(`/api/observations?region=${encodeURIComponent(regionId)}`)
}

export function fetchMetrics(regionId: string) {
  return getJson<MetricsDto>(`/api/metrics?region=${encodeURIComponent(regionId)}`)
}

export function fetchInvasives(regionId: string) {
  return getJson<InvasivesDto>(`/api/invasives?region=${encodeURIComponent(regionId)}`)
}
