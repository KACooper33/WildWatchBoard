import { Router } from 'express'
import { getObservationsForRegion } from '../services/inaturalist.ts'
import {
  observationQueryOptions,
  parseObservationWindow,
} from '../services/timeWindow.ts'

export const observationsRouter = Router()

observationsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const windowDays = parseObservationWindow(req.query.window ?? 30)
    const { observations, cachedAt, region } = await getObservationsForRegion(
      regionId,
      observationQueryOptions(regionId, windowDays),
    )
    res.json({
      region: region.id,
      windowDays,
      cachedAt,
      count: observations.length,
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
