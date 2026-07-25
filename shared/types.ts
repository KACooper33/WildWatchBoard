export type QualityGrade = 'research' | 'needs_id' | 'casual'

export interface ObservationDto {
  id: number
  lat: number | null
  lng: number | null
  obscured: boolean
  publicPositionalAccuracy: number | null
  displayName: string
  scientificName: string | null
  taxonId: number | null
  iconicTaxon: string
  qualityGrade: QualityGrade
  observer: string
  observerId: number | null
  observedOn: string | null
  thumbnailUrl: string | null
}

export interface RegionSummary {
  id: string
  name: string
  description?: string
}

export interface MetricsDto {
  region: string
  windowDays: number
  observationCount: number
  uniqueSpecies: number
  observerCount: number
  researchGradePercent: number
  qualityGrade: Record<QualityGrade, number>
  byIconicTaxon: Record<string, number>
  cachedAt: string | null
}

export interface InvasiveSpeciesConfig {
  commonName: string
  scientificName: string
  taxonId: number
}

export interface InvasiveSpeciesAlert {
  commonName: string
  scientificName: string
  taxonId: number
  observationCount: number
  latestObservedOn: string | null
  observations: ObservationDto[]
}

export interface InvasivesDto {
  region: string
  windowDays: number
  cachedAt: string | null
  totalInvasiveObservations: number
  alerts: InvasiveSpeciesAlert[]
}

export type ObservationWindowDays = 7 | 30 | 360

/** @deprecated Use ObservationWindowDays */
export type LeaderboardWindowDays = ObservationWindowDays

export interface LeaderboardEntry {
  rank: number
  observer: string
  observerId: number | null
  observationCount: number
  uniqueSpecies: number
}

export interface LeaderboardDto {
  region: string
  windowDays: ObservationWindowDays
  cachedAt: string | null
  observationSampleSize: number
  entries: LeaderboardEntry[]
}

export const ICONIC_TAXON_COLORS: Record<string, string> = {
  Aves: '#2f6fed',
  Mammalia: '#b45309',
  Reptilia: '#15803d',
  Amphibia: '#0f766e',
  Plantae: '#65a30d',
  Insecta: '#a16207',
  Fungi: '#7c3aed',
  Other: '#57534e',
}

export const ICONIC_TAXON_LABELS: Record<string, string> = {
  Aves: 'Birds',
  Mammalia: 'Mammals',
  Reptilia: 'Reptiles',
  Amphibia: 'Amphibians',
  Plantae: 'Plants',
  Insecta: 'Insects',
  Fungi: 'Fungi',
  Other: 'Other',
}
