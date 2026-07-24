import { Router } from 'express'
import { getObservationsForRegion } from '../services/inaturalist.ts'
import { computeMetrics } from '../services/metrics.ts'

export const metricsRouter = Router()

metricsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const { observations, cachedAt, region } = await getObservationsForRegion(regionId)
    const metrics = computeMetrics(region.id, region.windowDays, observations, cachedAt)
    res.json(metrics)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load metrics'
    const status = message.startsWith('Unknown region') ? 404 : 502
    res.status(status).json({ error: message })
  }
})
