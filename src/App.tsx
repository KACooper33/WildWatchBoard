import { useState, useTransition } from 'react'
import type { ObservationWindowDays } from '../shared/types'
import { ICONIC_TAXON_LABELS } from '../shared/types'
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
  const [appliedTaxa, setAppliedTaxa] = useState<string[]>([])
  const [isFilterPending, startFilterTransition] = useTransition()

  const metricsQuery = useMetrics(regionId, windowDays, appliedTaxa)
  const observationsQuery = useObservations(regionId, windowDays, appliedTaxa)
  const invasivesQuery = useInvasives(regionId, windowDays)
  const leaderboardQuery = useLeaderboard(regionId, windowDays)
  const trendsQuery = useTrends(regionId, windowDays, appliedTaxa)

  const filterBusy =
    isFilterPending ||
    (appliedTaxa.length > 0 &&
      (metricsQuery.isFetching ||
        observationsQuery.isFetching ||
        trendsQuery.isFetching))

  function applyTaxa(taxa: string[]) {
    startFilterTransition(() => {
      setAppliedTaxa(taxa)
    })
  }

  return (
    <div className="min-h-dvh">
      <Header
        regionName={activeRegion.name}
        regionDescription={activeRegion.description}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <TimeWindowToggle windowDays={windowDays} onChange={setWindowDays} />

        {appliedTaxa.length > 0 || filterBusy ? (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-3 py-2 text-sm text-[var(--color-ink)]"
            data-testid="taxon-filter-banner"
            aria-live="polite"
          >
            {filterBusy ? (
              <>
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
                  aria-hidden
                />
                <span>Updating filtered view…</span>
              </>
            ) : (
              <>
                <span className="font-medium">
                  Filtered to{' '}
                  {appliedTaxa.map((t) => ICONIC_TAXON_LABELS[t] ?? t).join(', ')}
                </span>
                <span className="text-[var(--color-ink-muted)]">
                  · snapshot, trends, and map (SQL archive)
                </span>
              </>
            )}
          </div>
        ) : null}

        <RegionSnapshot
          metrics={metricsQuery.data}
          groupCounts={metricsQuery.data?.groupCounts}
          isLoading={metricsQuery.isLoading}
          isFilterPending={filterBusy}
          error={metricsQuery.error}
          appliedTaxa={appliedTaxa}
          onApplyTaxa={applyTaxa}
        />
        <TrendsPanel
          data={trendsQuery.data}
          isLoading={trendsQuery.isLoading}
          isFilterPending={filterBusy}
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
          isLoading={observationsQuery.isLoading || filterBusy}
          mapLimit={observationsQuery.data?.limit}
          capped={observationsQuery.data?.capped}
          appliedTaxa={appliedTaxa}
          isFilterPending={filterBusy}
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
