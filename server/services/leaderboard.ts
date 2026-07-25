import type { LeaderboardDto, ObservationDto } from '../../shared/types.ts'
import { getObservationsForRegion } from './inaturalist.ts'
import {
  observationQueryOptions,
  parseObservationWindow,
} from './timeWindow.ts'

const LEADERBOARD_LIMIT = 10

function buildEntries(observations: ObservationDto[], limit: number) {
  const byObserver = new Map<
    string,
    { observer: string; observerId: number | null; count: number; taxa: Set<number> }
  >()

  for (const obs of observations) {
    const key =
      obs.observerId != null ? `id:${obs.observerId}` : `login:${obs.observer || 'Unknown'}`
    const existing = byObserver.get(key)
    if (existing) {
      existing.count += 1
      if (obs.taxonId != null) existing.taxa.add(obs.taxonId)
    } else {
      byObserver.set(key, {
        observer: obs.observer || 'Unknown',
        observerId: obs.observerId,
        count: 1,
        taxa: new Set(obs.taxonId != null ? [obs.taxonId] : []),
      })
    }
  }

  return [...byObserver.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.observer.localeCompare(b.observer)
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      observer: entry.observer,
      observerId: entry.observerId,
      observationCount: entry.count,
      uniqueSpecies: entry.taxa.size,
    }))
}

export async function getLeaderboardForRegion(
  regionId: string | undefined,
  windowDaysRaw: unknown,
): Promise<LeaderboardDto> {
  const windowDays = parseObservationWindow(windowDaysRaw)
  const { observations, cachedAt, region } = await getObservationsForRegion(
    regionId,
    observationQueryOptions(regionId, windowDays),
  )

  return {
    region: region.id,
    windowDays,
    cachedAt,
    observationSampleSize: observations.length,
    entries: buildEntries(observations, LEADERBOARD_LIMIT),
  }
}

export { parseObservationWindow as parseLeaderboardWindow }
