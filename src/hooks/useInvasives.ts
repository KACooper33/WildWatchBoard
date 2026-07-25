import { useQuery } from '@tanstack/react-query'
import type { ObservationWindowDays } from '../../shared/types'
import { fetchInvasives } from '../api/client'

export function useInvasives(regionId: string, windowDays: ObservationWindowDays) {
  return useQuery({
    queryKey: ['invasives', regionId, windowDays],
    queryFn: () => fetchInvasives(regionId, windowDays),
    enabled: Boolean(regionId),
  })
}
