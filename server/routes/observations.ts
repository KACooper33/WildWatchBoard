import { Router } from 'express'
import { queryObservationsForMap } from '../db/sqlite.ts'
import { isoDateDaysAgo, isoDateToday } from '../db/sqlite.ts'
import { ARCHIVE_YEARS_BACK, scheduleRegionBackfill } from '../services/archive.ts'
import { getRegion } from '../services/geoFilter.ts'
import { parseObservationWindow, parseTaxaFilter } from '../services/timeWindow.ts'

/** Intentional map pin cap — metrics/trends use the full SQL archive. */
export const MAP_OBSERVATION_LIMIT = 500

export const observationsRouter = Router()

observationsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const windowDays = parseObservationWindow(req.query.window ?? 30)
    const taxa = parseTaxaFilter(req.query.taxa)
    const region = getRegion(regionId)
    scheduleRegionBackfill(region.id, ARCHIVE_YEARS_BACK)

    const endDate = isoDateToday()
    const startDate = isoDateDaysAgo(windowDays)
    const observations = queryObservationsForMap(
      region.id,
      startDate,
      endDate,
      MAP_OBSERVATION_LIMIT,
      taxa,
    )

    res.json({
      region: region.id,
      windowDays,
      cachedAt: new Date().toISOString(),
      count: observations.length,
      limit: MAP_OBSERVATION_LIMIT,
      capped: observations.length >= MAP_OBSERVATION_LIMIT,
      appliedTaxa: taxa,
      observations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load observations'
    let status = 502
    if (message.startsWith('Unknown region')) status = 404
    if (message.startsWith('Invalid time window')) status = 400
    res.status(status).json({ error: message })
  }
})
