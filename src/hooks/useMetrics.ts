import { useQuery } from '@tanstack/react-query'
import { fetchMetrics } from '../api/client'

export function useMetrics(regionId: string) {
  return useQuery({
    queryKey: ['metrics', regionId],
    queryFn: () => fetchMetrics(regionId),
    enabled: Boolean(regionId),
  })
}
