import type { TrendsDto } from '../../shared/types'
import { ICONIC_TAXON_LABELS } from '../../shared/types'

interface TrendsPanelProps {
  data?: TrendsDto
  isLoading: boolean
  isFilterPending?: boolean
  error?: Error | null
}

function formatDelta(pct: number | null, invertBad = false): { text: string; className: string } {
  if (pct == null) return { text: '—', className: 'text-[var(--color-ink-muted)]' }
  if (pct === 0) return { text: '0%', className: 'text-[var(--color-ink-muted)]' }
  const up = pct > 0
  const text = `${up ? '+' : ''}${pct}%`
  const positive = invertBad ? !up : up
  return {
    text,
    className: positive ? 'text-emerald-800' : 'text-amber-900',
  }
}

function TrendRow({
  label,
  current,
  previous,
  delta,
  invertBad,
  suffix = '',
  showPrior,
}: {
  label: string
  current: number | string
  previous: number | string
  delta: number | null
  invertBad?: boolean
  suffix?: string
  showPrior: boolean
}) {
  const d = formatDelta(delta, invertBad)
  return (
    <div
      className={
        showPrior
          ? 'grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2 border-b border-[var(--color-border)] py-2.5 last:border-b-0 sm:gap-4'
          : 'grid grid-cols-[1fr_auto] items-baseline gap-2 border-b border-[var(--color-border)] py-2.5 last:border-b-0 sm:gap-4'
      }
    >
      <p className="text-sm text-[var(--color-ink)]">{label}</p>
      <p className="min-w-14 text-right font-semibold tabular-nums">
        {current}
        {suffix}
      </p>
      {showPrior ? (
        <>
          <p className="min-w-14 text-right text-sm tabular-nums text-[var(--color-ink-muted)]">
            {previous}
            {suffix}
          </p>
          <p className={`min-w-14 text-right text-sm font-semibold tabular-nums ${d.className}`}>
            {d.text}
          </p>
        </>
      ) : null}
    </div>
  )
}

export function TrendsPanel({
  data,
  isLoading,
  isFilterPending = false,
  error,
}: TrendsPanelProps) {
  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
        Could not load trends: {error.message}
      </section>
    )
  }

  if ((isLoading && !data) || !data) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading trends…</p>
      </section>
    )
  }

  const showPrior = data.priorAvailable
  const filterActive = data.appliedTaxa.length > 0
  const filterLabel = data.appliedTaxa.map((t) => ICONIC_TAXON_LABELS[t] ?? t).join(', ')

  return (
    <section
      className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="trends-panel"
      aria-busy={isFilterPending}
    >
      {isFilterPending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--color-panel)]/70">
          <p className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
              aria-hidden
            />
            Updating trends…
          </p>
        </div>
      ) : null}

      <div className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Comparable trends
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {showPrior
            ? `Current ${data.windowDays} days vs previous ${data.windowDays} days`
            : `Last ${data.windowDays} days`}
          {filterActive ? ` · filtered to ${filterLabel}` : ''}
        </p>
      </div>

      {!showPrior ? (
        <p className="mb-3 rounded-xl border border-[var(--color-border)] bg-white/60 px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          Prior comparison is unavailable for this window.
        </p>
      ) : null}

      <div
        className={
          showPrior
            ? 'mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] sm:gap-4'
            : 'mb-1 grid grid-cols-[1fr_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] sm:gap-4'
        }
      >
        <span>Metric</span>
        <span className="min-w-14 text-right">Now</span>
        {showPrior ? (
          <>
            <span className="min-w-14 text-right">Prior</span>
            <span className="min-w-14 text-right">Δ</span>
          </>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white/60 px-3 sm:px-4">
        <TrendRow
          label="Observations"
          current={data.current.observationCount}
          previous={data.previous.observationCount}
          delta={data.deltas.observationCountPct}
          showPrior={showPrior}
        />
        <TrendRow
          label="Unique species"
          current={data.current.uniqueSpecies}
          previous={data.previous.uniqueSpecies}
          delta={data.deltas.uniqueSpeciesPct}
          showPrior={showPrior}
        />
        <TrendRow
          label="Observers"
          current={data.current.observerCount}
          previous={data.previous.observerCount}
          delta={data.deltas.observerCountPct}
          showPrior={showPrior}
        />
        <TrendRow
          label="Research grade"
          current={data.current.researchGradePercent}
          previous={data.previous.researchGradePercent}
          delta={data.deltas.researchGradePercentPts}
          suffix="%"
          showPrior={showPrior}
        />
        <TrendRow
          label="Invasive sightings"
          current={data.current.invasiveCount}
          previous={data.previous.invasiveCount}
          delta={data.deltas.invasiveCountPct}
          invertBad
          showPrior={showPrior}
        />
      </div>
    </section>
  )
}
