import { useQuery } from '@tanstack/react-query'
import { fetchRegions } from '../api/client'

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions,
  })
}
