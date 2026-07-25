import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  GeoJSON,
  useMap,
} from 'react-leaflet'
import type { FeatureCollection } from 'geojson'
import type { ObservationDto } from '../../shared/types'
import { ICONIC_TAXON_COLORS, ICONIC_TAXON_LABELS } from '../../shared/types'

interface ObservationMapProps {
  /** Already filtered when a taxon filter is applied. */
  observations: ObservationDto[]
  isLoading: boolean
  /** Empty = all groups. */
  appliedTaxa: string[]
  isFilterPending?: boolean
}

const FALLBACK_CENTER: [number, number] = [37.68, -121.82]
const FALLBACK_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect fill="#d5e2d1" width="120" height="120"/>
      <circle cx="60" cy="48" r="18" fill="#2d6a4f" opacity="0.35"/>
      <path d="M28 92c8-18 24-28 32-28s24 10 32 28" fill="#2d6a4f" opacity="0.35"/>
    </svg>`,
  )

function FitBounds({
  observations,
  boundary,
}: {
  observations: ObservationDto[]
  boundary: FeatureCollection | null
}) {
  const map = useMap()

  useEffect(() => {
    const points = observations.filter(
      (o): o is ObservationDto & { lat: number; lng: number } =>
        o.lat != null && o.lng != null && Number.isFinite(o.lat) && Number.isFinite(o.lng),
    )

    if (points.length > 0) {
      const lats = points.map((p) => p.lat)
      const lngs = points.map((p) => p.lng)
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
        { padding: [28, 28], maxZoom: 12 },
      )
      return
    }

    if (boundary?.features?.[0]) {
      try {
        const layer = L.geoJSON(boundary)
        const bounds = layer.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [28, 28] })
        }
      } catch {
        map.setView(FALLBACK_CENTER, 11)
      }
    }
  }, [map, observations, boundary])

  return null
}

function ObservationPopup({ obs }: { obs: ObservationDto }) {
  const [src, setSrc] = useState(obs.thumbnailUrl || FALLBACK_THUMB)

  return (
    <div className="w-44 overflow-hidden">
      <img
        src={src}
        alt=""
        className="h-28 w-full object-cover"
        onError={() => setSrc(FALLBACK_THUMB)}
      />
      <div className="space-y-1 p-2.5">
        <p className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
          {obs.displayName}
        </p>
        {obs.scientificName && obs.scientificName !== obs.displayName ? (
          <p className="text-xs italic text-[var(--color-ink-muted)]">{obs.scientificName}</p>
        ) : null}
        <p className="text-xs text-[var(--color-ink-muted)]">
          {ICONIC_TAXON_LABELS[obs.iconicTaxon] ?? obs.iconicTaxon} · {obs.observer}
        </p>
        {obs.obscured ? (
          <p className="text-xs font-medium text-amber-800">Approximate location</p>
        ) : null}
      </div>
    </div>
  )
}

function topSpecies(observations: ObservationDto[], limit = 8) {
  const counts = new Map<string, number>()
  for (const obs of observations) {
    const name = obs.displayName || obs.scientificName || 'Unknown'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
}

export function ObservationMap({
  observations,
  isLoading,
  appliedTaxa,
  isFilterPending = false,
}: ObservationMapProps) {
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/tri_valley_boundary.geojson')
      .then((r) => r.json())
      .then((geo) => {
        if (!cancelled) setBoundary(geo as FeatureCollection)
      })
      .catch(() => {
        if (!cancelled) setBoundary(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const mappable = useMemo(
    () =>
      observations.filter(
        (o) => o.lat != null && o.lng != null && Number.isFinite(o.lat) && Number.isFinite(o.lng),
      ),
    [observations],
  )

  const species = useMemo(() => topSpecies(observations), [observations])
  const filterActive = appliedTaxa.length > 0
  const filterLabel = appliedTaxa.map((t) => ICONIC_TAXON_LABELS[t] ?? t).join(', ')
  const showPending = isLoading || isFilterPending

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm"
      data-testid="observation-map"
      aria-busy={showPending}
    >
      {isFilterPending ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-panel)]/65">
          <p className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
              aria-hidden
            />
            Updating map…
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Observations map
          </h2>
          {filterActive ? (
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Filtered: {filterLabel}
            </p>
          ) : null}
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">
          {showPending
            ? 'Updating…'
            : filterActive
              ? `${mappable.length} mapped · ${observations.length} in filter`
              : `${mappable.length} mapped`}
        </p>
      </div>

      {filterActive && !showPending ? (
        <div
          className="border-b border-[var(--color-border)] bg-white/50 px-4 py-3"
          data-testid="taxon-filter-results"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Top species in filter
          </p>
          {species.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No observations in these groups.</p>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {species.map(([name, count]) => (
                <li key={name} className="text-[var(--color-ink)]">
                  {name}{' '}
                  <span className="tabular-nums text-[var(--color-ink-muted)]">({count})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="h-[50vh] min-h-[280px] w-full sm:h-[min(62vh,640px)]">
        <MapContainer
          center={FALLBACK_CENTER}
          zoom={11}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {boundary ? (
            <GeoJSON
              data={boundary}
              style={{
                color: '#2d6a4f',
                weight: 2,
                fillColor: '#95d5b2',
                fillOpacity: 0.15,
              }}
            />
          ) : null}
          <FitBounds observations={mappable} boundary={boundary} />
          {mappable.map((obs) => (
            <CircleMarker
              key={obs.id}
              center={[obs.lat as number, obs.lng as number]}
              radius={7}
              pathOptions={{
                color: '#fcfaf5',
                weight: 1.5,
                fillColor: ICONIC_TAXON_COLORS[obs.iconicTaxon] ?? ICONIC_TAXON_COLORS.Other,
                fillOpacity: 0.9,
              }}
            >
              <Popup className="wwb-popup">
                <ObservationPopup obs={obs} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  )
}
