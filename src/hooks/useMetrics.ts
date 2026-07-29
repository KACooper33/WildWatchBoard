import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchMetrics } from '../api/client'

export function useMetrics(
  regionId: string,
  windowDays: ObservationWindowDays,
  taxa: string[] = [],
) {
  const taxaKey = [...taxa].sort().join(',')
  return useQuery({
    queryKey: ['metrics', regionId, windowDays, taxaKey],
    queryFn: () => fetchMetrics(regionId, windowDays, taxa),
    enabled: Boolean(regionId),
    placeholderData: keepPreviousData,
  })
}
