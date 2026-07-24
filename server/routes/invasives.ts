import { Router } from 'express'
import { getInvasivesForRegion } from '../services/invasives.ts'

export const invasivesRouter = Router()

invasivesRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const payload = await getInvasivesForRegion(regionId)
    res.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load invasives'
    const status = message.startsWith('Unknown region') ? 404 : 502
    res.status(status).json({ error: message })
  }
})
