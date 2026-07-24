interface HeaderProps {
  regionName: string
  regionDescription?: string
}

export function Header({ regionName, regionDescription }: HeaderProps) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-panel)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Regional biodiversity
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            WildWatchBoard
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold text-[var(--color-accent)]">{regionName}</p>
          {regionDescription ? (
            <p className="max-w-md text-sm text-[var(--color-ink-muted)]">{regionDescription}</p>
          ) : null}
        </div>
      </div>
    </header>
  )
}
