import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { metricsRouter } from './routes/metrics.ts'
import { observationsRouter } from './routes/observations.ts'
import { regionsRouter } from './routes/regions.ts'
import { invasivesRouter } from './routes/invasives.ts'
import { leaderboardRouter } from './routes/leaderboard.ts'
import { trendsRouter } from './routes/trends.ts'
import { getDb, getDbPath } from './db/sqlite.ts'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const isProd = process.env.NODE_ENV === 'production'

// Initialize SQLite on boot
getDb()

app.use((_req, res, next) => {
  res.setHeader('X-WildWatchBoard', 'api')
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'wildwatchboard', sqlitePath: getDbPath() })
})

app.use('/api/regions', regionsRouter)
app.use('/api/observations', observationsRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/invasives', invasivesRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/trends', trendsRouter)

const dataDir = join(process.cwd(), 'public', 'data')
if (existsSync(dataDir)) {
  app.use('/data', express.static(dataDir))
}

if (isProd) {
  const distDir = join(process.cwd(), 'dist')
  app.use(express.static(distDir))
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`WildWatchBoard API listening on http://localhost:${PORT}`)
  if (!isProd) {
    console.log(`Dev UI: http://localhost:5173 (proxied /api → :${PORT})`)
  }
})
