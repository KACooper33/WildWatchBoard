import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchTrends } from '../api/client'

export function useTrends(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['trends', regionId, windowDays],
    queryFn: () => fetchTrends(regionId, windowDays),
    enabled: Boolean(regionId),
    refetchInterval: (query) => {
      const status = query.state.data?.backfillStatus
      return status && !status.complete ? 8_000 : false
    },
  })
}
