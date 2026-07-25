import { useEffect, useState } from 'react'
import type { MetricsDto } from '../../shared/types'
import { ICONIC_TAXON_COLORS, ICONIC_TAXON_LABELS } from '../../shared/types'

interface RegionSnapshotProps {
  metrics?: MetricsDto
  /** Unfiltered group counts for chip labels (so multi-select stays usable). */
  groupCounts?: Record<string, number>
  isLoading: boolean
  isFilterPending?: boolean
  error?: Error | null
  /** Applied iconic-taxon filter (empty = all groups). */
  appliedTaxa: string[]
  onApplyTaxa: (taxa: string[]) => void
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

function sameTaxa(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((t) => setB.has(t))
}

export function RegionSnapshot({
  metrics,
  groupCounts,
  isLoading,
  isFilterPending = false,
  error,
  appliedTaxa,
  onApplyTaxa,
}: RegionSnapshotProps) {
  const [draftTaxa, setDraftTaxa] = useState<string[]>(appliedTaxa)

  useEffect(() => {
    setDraftTaxa(appliedTaxa)
  }, [appliedTaxa])

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

  const chipSource = groupCounts ?? metrics.byIconicTaxon
  const taxonEntries = Object.entries(chipSource).sort((a, b) => b[1] - a[1])
  const draftDirty = !sameTaxa(draftTaxa, appliedTaxa)
  const hasDraft = draftTaxa.length > 0
  const hasApplied = appliedTaxa.length > 0

  function toggleTaxon(key: string) {
    setDraftTaxa((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    )
  }

  return (
    <section
      className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="region-snapshot"
      aria-busy={isFilterPending}
    >
      {isFilterPending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--color-panel)]/70">
          <p className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
              aria-hidden
            />
            Updating metrics…
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Region snapshot
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]" data-testid="snapshot-summary">
          {hasApplied
            ? `Filtered · ${metrics.observationCount} observations`
            : `Last ${metrics.windowDays} days · ${metrics.observationCount} observations`}
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

      <div className="mt-5" data-testid="taxon-filter">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            By group
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Select groups, then apply to filter snapshot, trends, and map
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Observation groups">
          {taxonEntries.map(([key, count]) => {
            const selected = draftTaxa.includes(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTaxon(key)}
                className={
                  selected
                    ? 'inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-ink)]'
                    : 'inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/70 px-3 py-1.5 text-sm text-[var(--color-ink)] hover:border-[var(--color-accent-soft)]'
                }
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: ICONIC_TAXON_COLORS[key] ?? ICONIC_TAXON_COLORS.Other }}
                />
                {ICONIC_TAXON_LABELS[key] ?? key}
                <strong className="font-semibold tabular-nums">{count}</strong>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="taxon-filter-apply"
            disabled={!draftDirty || isFilterPending}
            onClick={() => onApplyTaxa(draftTaxa)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3.5 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFilterPending ? (
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
            ) : null}
            {isFilterPending ? 'Applying…' : 'Apply filter'}
          </button>
          <button
            type="button"
            data-testid="taxon-filter-clear"
            disabled={(!hasDraft && !hasApplied) || isFilterPending}
            onClick={() => {
              setDraftTaxa([])
              onApplyTaxa([])
            }}
            className="rounded-lg border border-[var(--color-border)] bg-white/70 px-3.5 py-1.5 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
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
