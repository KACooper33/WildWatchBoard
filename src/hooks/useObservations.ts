import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchObservations } from '../api/client'

export function useObservations(
  regionId: string,
  windowDays: ObservationWindowDays,
  taxa: string[] = [],
) {
  const taxaKey = [...taxa].sort().join(',')
  return useQuery({
    queryKey: ['observations', regionId, windowDays, taxaKey],
    queryFn: () => fetchObservations(regionId, windowDays, taxa),
    enabled: Boolean(regionId),
    placeholderData: keepPreviousData,
  })
}
