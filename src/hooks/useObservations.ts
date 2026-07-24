import { useQuery } from '@tanstack/react-query'
import { fetchObservations } from '../api/client'

export function useObservations(regionId: string) {
  return useQuery({
    queryKey: ['observations', regionId],
    queryFn: () => fetchObservations(regionId),
    enabled: Boolean(regionId),
  })
}
