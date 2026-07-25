import { Router } from 'express'
import { getLeaderboardForRegion } from '../services/leaderboard.ts'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', async (req, res) => {
  try {
    const regionId = typeof req.query.region === 'string' ? req.query.region : undefined
    const payload = await getLeaderboardForRegion(regionId, req.query.window ?? 30)
    res.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard'
    let status = 502
    if (message.startsWith('Unknown region')) status = 404
    if (message.startsWith('Invalid time window')) status = 400
    res.status(status).json({ error: message })
  }
})
