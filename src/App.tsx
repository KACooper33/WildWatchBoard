import { Header } from './components/Header'
import { InvasiveWatch } from './components/InvasiveWatch'
import { ObservationMap } from './components/ObservationMap'
import { RegionSnapshot } from './components/RegionSnapshot'
import { useInvasives } from './hooks/useInvasives'
import { useMetrics } from './hooks/useMetrics'
import { useObservations } from './hooks/useObservations'
import { useRegions } from './hooks/useRegions'

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

  const metricsQuery = useMetrics(regionId)
  const observationsQuery = useObservations(regionId)
  const invasivesQuery = useInvasives(regionId)

  return (
    <div className="min-h-dvh">
      <Header
        regionName={activeRegion.name}
        regionDescription={activeRegion.description}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <RegionSnapshot
          metrics={metricsQuery.data}
          isLoading={metricsQuery.isLoading}
          error={metricsQuery.error}
        />
        <InvasiveWatch
          data={invasivesQuery.data}
          isLoading={invasivesQuery.isLoading}
          error={invasivesQuery.error}
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
