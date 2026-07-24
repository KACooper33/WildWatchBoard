import { Router } from 'express'
import { getDefaultRegionId, listRegions } from '../services/geoFilter.ts'

export const regionsRouter = Router()

regionsRouter.get('/', (_req, res) => {
  res.json({
    defaultRegion: getDefaultRegionId(),
    regions: listRegions(),
  })
})
