import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchObservations } from '../api/client'

export function useObservations(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['observations', regionId, windowDays],
    queryFn: () => fetchObservations(regionId, windowDays),
    enabled: Boolean(regionId),
  })
}
