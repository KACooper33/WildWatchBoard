import type { LeaderboardDto } from '../../shared/types'

interface LeaderboardProps {
  data?: LeaderboardDto
  isLoading: boolean
  error?: Error | null
}

export function Leaderboard({ data, isLoading, error }: LeaderboardProps) {
  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-sm sm:p-5"
      data-testid="leaderboard"
    >
      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Community leaderboard
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Top contributors by observation count in this region
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-900">
          Could not load leaderboard: {error.message}
        </p>
      ) : null}

      {!error && (isLoading || !data) ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading leaderboard…</p>
      ) : null}

      {!error && data ? (
        <>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
            Last {data.windowDays} days · based on {data.observationSampleSize} observations
            (sample may be capped by API pagination)
          </p>
          {data.entries.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No contributors in this window yet.
            </p>
          ) : (
            <ol className="max-h-[17.5rem] overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-border)] bg-white/60">
              {data.entries.map((entry) => (
                <li
                  key={`${entry.rank}-${entry.observerId ?? entry.observer}`}
                  className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] px-3 last:border-b-0 sm:px-4"
                >
                  <span
                    className={
                      entry.rank <= 3
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white'
                        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-deep)] text-sm font-semibold text-[var(--color-ink-muted)]'
                    }
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--color-ink)]">{entry.observer}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {entry.uniqueSpecies} species
                    </p>
                  </div>
                  <p className="shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums">
                    {entry.observationCount}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </section>
  )
}
