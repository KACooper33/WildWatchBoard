import { useState } from 'react'
import type { ObservationWindowDays } from '../shared/types'
import { Header } from './components/Header'
import { InvasiveWatch } from './components/InvasiveWatch'
import { Leaderboard } from './components/Leaderboard'
import { ObservationMap } from './components/ObservationMap'
import { RegionSnapshot } from './components/RegionSnapshot'
import { TimeWindowToggle } from './components/TimeWindowToggle'
import { TrendsPanel } from './components/TrendsPanel'
import { useInvasives } from './hooks/useInvasives'
import { useLeaderboard } from './hooks/useLeaderboard'
import { useMetrics } from './hooks/useMetrics'
import { useObservations } from './hooks/useObservations'
import { useRegions } from './hooks/useRegions'
import { useTrends } from './hooks/useTrends'

const DEFAULT_REGION = 'tri-valley'

export default function App() {
  const regionsQuery = useRegions()
  const regionId = regionsQuery.data?.defaultRegion ?? DEFAULT_REGION
  const activeRegion =
    regionsQuery.data?.regions.find((r) => r.id === regionId) ?? {
      id: DEFAULT_REGION,
      name: 'Tri-Valley',
      description:
        'Dublin, Pleasanton, Livermore, Del Valle, Sycamore Grove, and Brushy Peak',
    }

  const [windowDays, setWindowDays] = useState<ObservationWindowDays>(30)

  const metricsQuery = useMetrics(regionId, windowDays)
  const observationsQuery = useObservations(regionId, windowDays)
  const invasivesQuery = useInvasives(regionId, windowDays)
  const leaderboardQuery = useLeaderboard(regionId, windowDays)
  const trendsQuery = useTrends(regionId, windowDays)

  return (
    <div className="min-h-dvh">
      <Header
        regionName={activeRegion.name}
        regionDescription={activeRegion.description}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <TimeWindowToggle windowDays={windowDays} onChange={setWindowDays} />
        <RegionSnapshot
          metrics={metricsQuery.data}
          isLoading={metricsQuery.isLoading}
          error={metricsQuery.error}
        />
        <TrendsPanel
          data={trendsQuery.data}
          isLoading={trendsQuery.isLoading}
          error={trendsQuery.error}
        />
        <InvasiveWatch
          data={invasivesQuery.data}
          isLoading={invasivesQuery.isLoading}
          error={invasivesQuery.error}
        />
        <Leaderboard
          data={leaderboardQuery.data}
          isLoading={leaderboardQuery.isLoading}
          error={leaderboardQuery.error}
        />
        <ObservationMap
          observations={observationsQuery.data?.observations ?? []}
          isLoading={observationsQuery.isLoading}
        />

        <footer className="pb-6 text-center text-xs text-[var(--color-ink-muted)]">
          Observation data from{' '}
          <a
            className="underline decoration-[var(--color-accent-soft)] underline-offset-2 hover:text-[var(--color-accent)]"
            href="https://www.inaturalist.org/"
            target="_blank"
            rel="noreferrer"
          >
            iNaturalist
          </a>
          . Map tiles © OpenStreetMap contributors.
        </footer>
      </main>
    </div>
  )
}
