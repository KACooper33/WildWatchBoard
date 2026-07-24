import type { MetricsDto } from '../../shared/types'
import { ICONIC_TAXON_COLORS, ICONIC_TAXON_LABELS } from '../../shared/types'

interface RegionSnapshotProps {
  metrics?: MetricsDto
  isLoading: boolean
  error?: Error | null
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export function RegionSnapshot({ metrics, isLoading, error }: RegionSnapshotProps) {
  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900"
        aria-live="polite"
      >
        Could not load region snapshot: {error.message}
      </section>
    )
  }

  if (isLoading || !metrics) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <p className="text-sm text-[var(--color-ink-muted)]">Loading region snapshot…</p>
      </section>
    )
  }

  const qualityTotal =
    metrics.qualityGrade.research +
    metrics.qualityGrade.needs_id +
    metrics.qualityGrade.casual

  const taxonEntries = Object.entries(metrics.byIconicTaxon).sort((a, b) => b[1] - a[1])

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="region-snapshot"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Region snapshot
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Last {metrics.windowDays} days · {metrics.observationCount} observations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Observations" value={String(metrics.observationCount)} />
        <Stat label="Unique species" value={String(metrics.uniqueSpecies)} />
        <Stat
          label="Verified (research grade)"
          value={formatPercent(metrics.researchGradePercent)}
        />
        <Stat label="Observers" value={String(metrics.observerCount)} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Quality mix
        </p>
        <div className="flex h-3 overflow-hidden rounded-full bg-[var(--color-bg-deep)]">
          {qualityTotal > 0 ? (
            <>
              <div
                className="bg-[var(--color-accent)]"
                style={{ width: `${(metrics.qualityGrade.research / qualityTotal) * 100}%` }}
                title={`Research ${metrics.qualityGrade.research}`}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${(metrics.qualityGrade.needs_id / qualityTotal) * 100}%` }}
                title={`Needs ID ${metrics.qualityGrade.needs_id}`}
              />
              <div
                className="bg-stone-400"
                style={{ width: `${(metrics.qualityGrade.casual / qualityTotal) * 100}%` }}
                title={`Casual ${metrics.qualityGrade.casual}`}
              />
            </>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-ink-muted)]">
          <span>Research {metrics.qualityGrade.research}</span>
          <span>Needs ID {metrics.qualityGrade.needs_id}</span>
          <span>Casual {metrics.qualityGrade.casual}</span>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          By group
        </p>
        <div className="flex flex-wrap gap-2">
          {taxonEntries.map(([key, count]) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: ICONIC_TAXON_COLORS[key] ?? ICONIC_TAXON_COLORS.Other }}
              />
              {ICONIC_TAXON_LABELS[key] ?? key}
              <strong className="font-semibold">{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-3">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}
