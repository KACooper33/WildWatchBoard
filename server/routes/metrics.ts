import { Router } from 'express'
import { getObservationsForRegion } from '../services/inaturalist.ts'
import { computeMetrics } from '../services/metrics.ts'
import {
  observationQueryOptions,
  parseObservationWindow,
} from '../services/timeWindow.ts'

export const metricsRouter = Router()

metricsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const windowDays = parseObservationWindow(req.query.window ?? 30)
    const { observations, cachedAt, region } = await getObservationsForRegion(
      regionId,
      observationQueryOptions(regionId, windowDays),
    )
    const metrics = computeMetrics(region.id, windowDays, observations, cachedAt)
    res.json(metrics)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load metrics'
    let status = 502
    if (message.startsWith('Unknown region')) status = 404
    if (message.startsWith('Invalid time window')) status = 400
    res.status(status).json({ error: message })
  }
})
