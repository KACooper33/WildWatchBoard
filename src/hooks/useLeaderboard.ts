import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchLeaderboard } from '../api/client'

export function useLeaderboard(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['leaderboard', regionId, windowDays],
    queryFn: () => fetchLeaderboard(regionId, windowDays),
    enabled: Boolean(regionId),
  })
}
