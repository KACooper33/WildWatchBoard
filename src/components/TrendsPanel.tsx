import type { TrendsDto, YearlyTrendPoint } from '../../shared/types'

interface TrendsPanelProps {
  data?: TrendsDto
  isLoading: boolean
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
          ? 'grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_3.5rem] items-baseline gap-2 border-b border-[var(--color-border)] py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_4rem_4rem_4rem] sm:gap-4'
          : 'grid grid-cols-[minmax(0,1fr)_3.5rem] items-baseline gap-2 border-b border-[var(--color-border)] py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_4rem] sm:gap-4'
      }
    >
      <p className="text-sm text-[var(--color-ink)]">{label}</p>
      <p className="text-right font-semibold tabular-nums">
        {current}
        {suffix}
      </p>
      {showPrior ? (
        <>
          <p className="text-right text-sm tabular-nums text-[var(--color-ink-muted)]">
            {previous}
            {suffix}
          </p>
          <p className={`text-right text-sm font-semibold tabular-nums ${d.className}`}>
            {d.text}
          </p>
        </>
      ) : null}
    </div>
  )
}

function YearlyBars({
  yearly,
  yearsBack,
}: {
  yearly: YearlyTrendPoint[]
  yearsBack: number
}) {
  const max = Math.max(1, ...yearly.map((y) => y.observationCount))
  const title = `${yearsBack}-year history`

  return (
    <div className="mt-5" data-testid="yearly-history">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Observations by year from the local SQL archive
        </p>
      </div>
      <ul className="space-y-2">
        {yearly.map((point) => {
          const widthPct = Math.max(2, Math.round((point.observationCount / max) * 100))
          return (
            <li key={point.year} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2">
              <span className="text-sm tabular-nums text-[var(--color-ink)]">{point.year}</span>
              <div className="h-3 overflow-hidden rounded bg-[var(--color-bg-deep)]">
                <div
                  className={
                    point.isPartial
                      ? 'h-full rounded bg-[var(--color-accent)]/55'
                      : 'h-full rounded bg-[var(--color-accent)]'
                  }
                  style={{ width: `${widthPct}%` }}
                  title={`${point.observationCount} observations`}
                />
              </div>
              <span className="min-w-16 text-right text-sm tabular-nums text-[var(--color-ink-muted)]">
                {point.observationCount.toLocaleString()}
                {point.isPartial ? ' YTD' : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function TrendsPanel({ data, isLoading, error }: TrendsPanelProps) {
  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
        Could not load trends: {error.message}
      </section>
    )
  }

  if (isLoading || !data) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading trends…</p>
      </section>
    )
  }

  const showPrior = data.priorAvailable
  const backfill = data.backfillStatus
  const building = backfill && !backfill.complete

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="trends-panel"
    >
      <div className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Comparable trends
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {showPrior
            ? `Current ${data.windowDays} days vs previous ${data.windowDays} days`
            : `Last ${data.windowDays} days`}
          {` · last ${backfill?.yearsBack ?? 5} years archived`}
        </p>
      </div>

      {building ? (
        <p
          className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-3 py-2 text-xs text-[var(--color-ink)]"
          data-testid="archive-backfill-status"
          aria-live="polite"
        >
          <span
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
            aria-hidden
          />
          Building history… {backfill.completeMonths}/{backfill.requiredMonths} months
          archived. Page loads only fetch missing months.
        </p>
      ) : null}

      {!showPrior ? (
        <p className="mb-3 rounded-xl border border-[var(--color-border)] bg-white/60 px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          Prior comparison is unavailable for this window.
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--color-border)] bg-white/60 px-3 sm:px-4">
        <div
          className={
            showPrior
              ? 'grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_3.5rem] gap-2 border-b border-[var(--color-border)] py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] sm:grid-cols-[minmax(0,1fr)_4rem_4rem_4rem] sm:gap-4'
              : 'grid grid-cols-[minmax(0,1fr)_3.5rem] gap-2 border-b border-[var(--color-border)] py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] sm:grid-cols-[minmax(0,1fr)_4rem] sm:gap-4'
          }
        >
          <span>Metric</span>
          <span className="text-right">Now</span>
          {showPrior ? (
            <>
              <span className="text-right">Prior</span>
              <span className="text-right">Δ</span>
            </>
          ) : null}
        </div>

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

      {data.yearly.length > 0 ? (
        <YearlyBars yearly={data.yearly} yearsBack={backfill?.yearsBack ?? 5} />
      ) : null}
    </section>
  )
}
