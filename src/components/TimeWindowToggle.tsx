import type { ObservationWindowDays } from '../../shared/types'

interface TimeWindowToggleProps {
  windowDays: ObservationWindowDays
  onChange: (windowDays: ObservationWindowDays) => void
}

const WINDOWS: ObservationWindowDays[] = [7, 30, 90]

export function TimeWindowToggle({ windowDays, onChange }: TimeWindowToggleProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 shadow-sm"
      data-testid="time-window-toggle"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink)]">Time window</p>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Applies to snapshot, trends, invasives, leaderboard, and map
        </p>
      </div>
      <div
        className="inline-flex rounded-full border border-[var(--color-border)] bg-white/70 p-1"
        role="tablist"
        aria-label="Observation time window"
      >
        {WINDOWS.map((days) => {
          const selected = days === windowDays
          return (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? 'rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-white'
                  : 'rounded-full px-3 py-1.5 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }
              onClick={() => onChange(days)}
            >
              {days}d
            </button>
          )
        })}
      </div>
    </div>
  )
}
