import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchMetrics } from '../api/client'

export function useMetrics(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['metrics', regionId, windowDays],
    queryFn: () => fetchMetrics(regionId, windowDays),
    enabled: Boolean(regionId),
  })
}
