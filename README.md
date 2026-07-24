# WildWatchBoard

Regional biodiversity dashboard for community science observations. The first region is the **Tri-Valley** (Dublin, Pleasanton, Livermore, Del Valle, Sycamore Grove, Brushy Peak). Architecture is multi-region ready via `server/config/regions.config.json`.

Data is sourced from the [iNaturalist API](https://api.inaturalist.org/v1/), filtered with a GeoJSON boundary (Turf.js point-in-polygon), and served by a thin Express API to a React + Leaflet UI.

## Stack

- React + TypeScript + Vite + Tailwind CSS
- Express API (`server/`) with in-memory TTL cache + request throttle
- React-Leaflet map
- TanStack Query
- Playwright e2e (mocked API)

## Quick start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:3001 (`/api/regions`, `/api/observations`, `/api/metrics`, `/api/invasives`)

## Production

```bash
npm run build
npm start
```

Serves the Vite `dist/` build and `/api/*` from one Node process (`PORT`, default `3001`).

### Useful env vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | HTTP port |
| `CACHE_TTL_MS` | `300000` (5 min) | Observation/metrics cache TTL |
| `INAT_USER_AGENT` | WildWatchBoard/… | Identify the app to iNaturalist |

## Region snapshot metrics

Over the last **30 days** (pagination capped):

- Observations, unique species, research-grade %, observers
- Quality mix (research / needs ID / casual)
- Counts by life form (birds, mammals, plants, …)

## Invasive species watch

Flags configured high-priority invasives from `server/config/target_species.json` (Nutria, Yellow Starthistle, Tree of Heaven, Water Hyacinth) within the same observation window. Species with sightings are highlighted; clear species still appear so the watch list is visible.

API: `GET /api/invasives?region=tri-valley`

## Adding a region

1. Add a GeoJSON polygon under `public/data/`
2. Add an entry in `server/config/regions.config.json` (`bbox`, `geojsonPath`, `windowDays`, pagination caps)
3. Restart the API

## Tests

```bash
npx playwright install chromium
npm run test:e2e
```

E2E mocks `/api/*` so CI does not call iNaturalist.

## Edge cases handled

- Obscured / missing coordinates (no map crash; approximate-location note)
- Missing photo thumbnails (SVG fallback)
- Missing common names → scientific name → “Unknown”
- Upstream rate limits (server throttle + TTL cache + in-flight dedupe)

## Attribution

Observation data © [iNaturalist](https://www.inaturalist.org/) contributors. Please respect [iNaturalist API guidelines](https://www.inaturalist.org/pages/api+reference) (including rate limits). Map tiles © OpenStreetMap contributors.

## Domain

Intended production host: **wildwatchboard** (DNS/SSL when you deploy).
