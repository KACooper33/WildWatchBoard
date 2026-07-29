import { Router } from 'express'
import { getMetricsForRegion } from '../services/metrics.ts'

export const metricsRouter = Router()

metricsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const metrics = await getMetricsForRegion(
      regionId,
      req.query.window ?? 30,
      req.query.taxa,
    )
    res.json(metrics)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load metrics'
    let status = 502
    if (message.startsWith('Unknown region')) status = 404
    if (message.startsWith('Invalid time window')) status = 400
    res.status(status).json({ error: message })
  }
})
