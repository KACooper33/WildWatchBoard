import { Router } from 'express'
import { getObservationsForRegion } from '../services/inaturalist.ts'

export const observationsRouter = Router()

observationsRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const { observations, cachedAt, region } = await getObservationsForRegion(regionId)
    res.json({
      region: region.id,
      windowDays: region.windowDays,
      cachedAt,
      count: observations.length,
      observations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load observations'
    const status = message.startsWith('Unknown region') ? 404 : 502
    res.status(status).json({ error: message })
  }
})
