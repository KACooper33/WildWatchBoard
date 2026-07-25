import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  InvasiveSpeciesAlert,
  InvasiveSpeciesConfig,
  InvasivesDto,
  ObservationDto,
} from '../../shared/types.ts'
import { getObservationsForRegion } from './inaturalist.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

type TargetSpeciesFile = {
  invasives: InvasiveSpeciesConfig[]
}

function loadTargetSpecies(): InvasiveSpeciesConfig[] {
  const candidates = [
    join(process.cwd(), 'server', 'config', 'target_species.json'),
    join(__dirname, '..', 'config', 'target_species.json'),
  ]

  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw) as TargetSpeciesFile
      return parsed.invasives ?? []
    } catch {
      // try next
    }
  }

  throw new Error('target_species.json not found')
}

function matchesInvasive(obs: ObservationDto, species: InvasiveSpeciesConfig): boolean {
  if (obs.taxonId != null && obs.taxonId === species.taxonId) {
    return true
  }

  const scientific = obs.scientificName?.trim().toLowerCase()
  const target = species.scientificName.trim().toLowerCase()
  if (scientific && (scientific === target || scientific.startsWith(`${target} `))) {
    return true
  }

  const display = obs.displayName.trim().toLowerCase()
  const common = species.commonName.trim().toLowerCase()
  return display === common
}

function latestDate(dates: Array<string | null>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d)).sort()
  return valid.length ? valid[valid.length - 1]! : null
}

export async function getInvasivesForRegion(regionId?: string): Promise<InvasivesDto> {
  const targets = loadTargetSpecies()
  const { observations, cachedAt, region } = await getObservationsForRegion(regionId)

  const alerts: InvasiveSpeciesAlert[] = targets.map((species) => {
    const hits = observations
      .filter((obs) => matchesInvasive(obs, species))
      .sort((a, b) => (b.observedOn || '').localeCompare(a.observedOn || ''))

    return {
      commonName: species.commonName,
      scientificName: species.scientificName,
      taxonId: species.taxonId,
      observationCount: hits.length,
      latestObservedOn: latestDate(hits.map((h) => h.observedOn)),
      observations: hits.slice(0, 8),
    }
  })

  alerts.sort((a, b) => {
    if (b.observationCount !== a.observationCount) {
      return b.observationCount - a.observationCount
    }
    return a.commonName.localeCompare(b.commonName)
  })

  return {
    region: region.id,
    windowDays: region.windowDays,
    cachedAt,
    totalInvasiveObservations: alerts.reduce((sum, a) => sum + a.observationCount, 0),
    alerts,
  }
}
