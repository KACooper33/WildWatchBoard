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
  observations: ObservationDto[]
  isLoading: boolean
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

export function ObservationMap({ observations, isLoading }: ObservationMapProps) {
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

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm"
      data-testid="observation-map"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Observations map
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          {isLoading ? 'Loading…' : `${mappable.length} mapped`}
        </p>
      </div>
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
