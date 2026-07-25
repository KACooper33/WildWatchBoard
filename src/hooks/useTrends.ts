import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchTrends } from '../api/client'

export function useTrends(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['trends', regionId, windowDays],
    queryFn: () => fetchTrends(regionId, windowDays),
    enabled: Boolean(regionId),
  })
}
