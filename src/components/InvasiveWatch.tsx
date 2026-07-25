import type { InvasivesDto } from '../../shared/types'

interface InvasiveWatchProps {
  data?: InvasivesDto
  isLoading: boolean
  error?: Error | null
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvasiveWatch({ data, isLoading, error }: InvasiveWatchProps) {
  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900"
        aria-live="polite"
      >
        Could not load invasive species watch: {error.message}
      </section>
    )
  }

  if (isLoading || !data) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading invasive species watch…</p>
      </section>
    )
  }

  const activeCount = data.alerts.filter((a) => a.observationCount > 0).length

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="invasive-watch"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Invasive species watch
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            High-priority regional invasives in the last {data.windowDays} days
          </p>
        </div>
        <p className="text-sm font-medium text-[var(--color-ink-muted)]">
          {activeCount > 0
            ? `${activeCount} flagged · ${data.totalInvasiveObservations} sightings`
            : 'No target invasives in this window'}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {data.alerts.map((alert) => {
          const hasHits = alert.observationCount > 0
          return (
            <li
              key={alert.taxonId}
              className={
                hasHits
                  ? 'rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5'
                  : 'rounded-xl border border-[var(--color-border)] bg-white/55 p-3.5'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{alert.commonName}</p>
                  <p className="text-sm italic text-[var(--color-ink-muted)]">
                    {alert.scientificName}
                  </p>
                </div>
                <span
                  className={
                    hasHits
                      ? 'rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-950'
                      : 'rounded-full bg-[var(--color-bg-deep)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-ink-muted)]'
                  }
                >
                  {hasHits ? `${alert.observationCount} seen` : 'Clear'}
                </span>
              </div>

              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                Latest: {formatDate(alert.latestObservedOn)}
              </p>

              {hasHits ? (
                <ul className="mt-3 space-y-1.5 border-t border-amber-200/70 pt-2.5">
                  {alert.observations.slice(0, 3).map((obs) => (
                    <li
                      key={obs.id}
                      className="flex items-baseline justify-between gap-2 text-xs text-[var(--color-ink)]"
                    >
                      <span className="truncate">
                        {obs.observer}
                        {obs.obscured ? ' · approx. location' : ''}
                      </span>
                      <span className="shrink-0 text-[var(--color-ink-muted)]">
                        {formatDate(obs.observedOn)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
