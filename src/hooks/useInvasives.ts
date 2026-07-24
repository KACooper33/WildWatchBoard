import { useQuery } from '@tanstack/react-query'
import { fetchInvasives } from '../api/client'

export function useInvasives(regionId: string) {
  return useQuery({
    queryKey: ['invasives', regionId],
    queryFn: () => fetchInvasives(regionId),
    enabled: Boolean(regionId),
  })
}
