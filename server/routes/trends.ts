import { Router } from 'express'
import { getTrendsForRegion } from '../services/trends.ts'

export const trendsRouter = Router()

trendsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const payload = await getTrendsForRegion(regionId, req.query.window ?? 30)
    res.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load trends'
    let status = 502
    if (message.startsWith('Unknown region')) status = 404
    if (message.startsWith('Invalid time window')) status = 400
    res.status(status).json({ error: message })
  }
})
