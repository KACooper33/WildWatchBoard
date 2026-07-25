import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchTrends } from '../api/client'

export function useTrends(
  regionId: string,
  windowDays: ObservationWindowDays,
  taxa: string[] = [],
) {
  const taxaKey = [...taxa].sort().join(',')
  return useQuery({
    queryKey: ['trends', regionId, windowDays, taxaKey],
    queryFn: () => fetchTrends(regionId, windowDays, taxa),
    enabled: Boolean(regionId),
    placeholderData: keepPreviousData,
  })
}
