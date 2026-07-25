import type {
  InvasivesDto,
  LeaderboardDto,
  MetricsDto,
  ObservationDto,
  ObservationWindowDays,
  RegionSummary,
  TrendsDto,
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

function withWindow(path: string, regionId: string, windowDays: ObservationWindowDays) {
  return `${path}?region=${encodeURIComponent(regionId)}&window=${windowDays}`
}

export function fetchRegions() {
  return getJson<{ defaultRegion: string; regions: RegionSummary[] }>('/api/regions')
}

export function fetchObservations(regionId: string, windowDays: ObservationWindowDays) {
  return getJson<{
    region: string
    windowDays: number
    cachedAt: string
    count: number
    observations: ObservationDto[]
  }>(withWindow('/api/observations', regionId, windowDays))
}

export function fetchMetrics(regionId: string, windowDays: ObservationWindowDays) {
  return getJson<MetricsDto>(withWindow('/api/metrics', regionId, windowDays))
}

export function fetchInvasives(regionId: string, windowDays: ObservationWindowDays) {
  return getJson<InvasivesDto>(withWindow('/api/invasives', regionId, windowDays))
}

export function fetchLeaderboard(regionId: string, windowDays: ObservationWindowDays) {
  return getJson<LeaderboardDto>(withWindow('/api/leaderboard', regionId, windowDays))
}

export function fetchTrends(regionId: string, windowDays: ObservationWindowDays) {
  return getJson<TrendsDto>(withWindow('/api/trends', regionId, windowDays))
}
