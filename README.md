# WildWatchBoard

Regional biodiversity dashboard for community science observations. The first region is the **Tri-Valley** (Dublin, Pleasanton, Livermore, Del Valle, Sycamore Grove, Brushy Peak). Architecture is multi-region ready via `server/config/regions.config.json`.

Data is sourced from the [iNaturalist API](https://api.inaturalist.org/v1/), filtered with a GeoJSON boundary (Turf.js point-in-polygon), and served by a thin Express API to a React + Leaflet UI.

## Stack

- React + TypeScript + Vite + Tailwind CSS
- Express API (`server/`) with SQLite persistence + in-memory TTL cache + request throttle
- React-Leaflet map
- TanStack Query
- Playwright e2e (mocked API)

## Quick start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:3001 (`/api/regions`, `/api/observations`, `/api/metrics`, `/api/invasives`, `/api/leaderboard`, `/api/trends`)

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
| `SQLITE_PATH` | `data/wildwatchboard.sqlite` | SQLite database file |
| `INAT_USER_AGENT` | WildWatchBoard/… | Identify the app to iNaturalist |

### Deploy on Fly.io

This app runs as one Node process with SQLite on a persistent volume. Do **not** attach Fly Postgres.

1. Install the [Fly CLI](https://fly.io/docs/flyctl/install/) and sign in (`fly auth login`).
2. From the repo root (with `Dockerfile` + `fly.toml` on `main`):

```bash
fly launch --copy-config --no-deploy
fly volumes create wildwatch_data --region sjc --size 1
fly deploy
```

If the app already exists and GitHub is linked, create the **`wildwatch_data`** volume in **`sjc`** (1 GB), then deploy from GitHub or run `fly deploy`.

- Region: **`sjc`** (San Jose)
- Volume mount: `/data` → `SQLITE_PATH=/data/wildwatchboard.sqlite`
- Health check: `https://<app>.fly.dev/api/health`

If `wildwatchboard` is taken, change `app` in `fly.toml` before launch.

## Region snapshot metrics

Over the last **30 days** (pagination capped):

- Observations, unique species, research-grade %, observers
- Quality mix (research / needs ID / casual)
- Counts by life form (birds, mammals, plants, …)

## Invasive species watch

Flags configured high-priority invasives from `server/config/target_species.json` (Nutria, Yellow Starthistle, Tree of Heaven, Water Hyacinth). Each species shows **Now vs Prior** counts for the shared 7 / 30 / 90 day window (equal page budgets per period, same fairness rule as trends). Species with current sightings are highlighted; clear species still appear so the watch list is visible.

API: `GET /api/invasives?region=tri-valley&window=30`

## Community leaderboard

Ranks top contributors by observation count. Shows the top 10 (about 5 visible, scroll for the rest).

A shared **7 / 30 / 90** day toggle drives snapshot, trends, invasives, leaderboard, and map together (`?window=` on those API routes).

## Comparable trends

`GET /api/trends` compares current vs previous windows for **7d, 30d, and 90d** (equal page budgets per period so Now is not inflated vs Prior). Observations are upserted into SQLite; dashboard responses reuse the exact last fetch payload.

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
