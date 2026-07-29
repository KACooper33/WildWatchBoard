import { expect, test } from '@playwright/test'

const mockMetrics = {
  region: 'tri-valley',
  windowDays: 30,
  observationCount: 4,
  uniqueSpecies: 3,
  observerCount: 4,
  researchGradePercent: 50,
  qualityGrade: { research: 2, needs_id: 1, casual: 1 },
  byIconicTaxon: { Aves: 1, Amphibia: 1, Plantae: 1, Other: 1 },
  groupCounts: { Aves: 1, Amphibia: 1, Plantae: 1, Other: 1 },
  appliedTaxa: [],
  cachedAt: '2026-07-23T00:00:00.000Z',
}

const mockObservations = {
  region: 'tri-valley',
  windowDays: 30,
  cachedAt: '2026-07-23T00:00:00.000Z',
  count: 3,
  limit: 500,
  capped: false,
  appliedTaxa: [],
  observations: [
    {
      id: 1001,
      lat: 37.68,
      lng: -121.82,
      obscured: true,
      publicPositionalAccuracy: 28000,
      displayName: 'California Tiger Salamander',
      scientificName: 'Ambystoma californiense',
      taxonId: 26718,
      iconicTaxon: 'Amphibia',
      qualityGrade: 'research',
      observer: 'herp_watcher',
      observerId: 11,
      observedOn: '2026-07-01',
      thumbnailUrl: null,
    },
    {
      id: 1002,
      lat: 37.7,
      lng: -121.9,
      obscured: false,
      publicPositionalAccuracy: 10,
      displayName: 'Red-tailed Hawk',
      scientificName: 'Buteo jamaicensis',
      taxonId: 9083,
      iconicTaxon: 'Aves',
      qualityGrade: 'needs_id',
      observer: 'bird_nerd',
      observerId: 22,
      observedOn: '2026-07-02',
      thumbnailUrl: null,
    },
    {
      id: 1003,
      lat: null,
      lng: null,
      obscured: false,
      publicPositionalAccuracy: null,
      displayName: 'Quercus agrifolia',
      scientificName: 'Quercus agrifolia',
      taxonId: 47126,
      iconicTaxon: 'Plantae',
      qualityGrade: 'casual',
      observer: 'oak_spotter',
      observerId: 33,
      observedOn: '2026-07-03',
      thumbnailUrl: null,
    },
  ],
}

const mockRegions = {
  defaultRegion: 'tri-valley',
  regions: [
    {
      id: 'tri-valley',
      name: 'Tri-Valley',
      description: 'Dublin, Pleasanton, Livermore, Del Valle, Sycamore Grove, and Brushy Peak',
    },
  ],
}

const mockInvasives = {
  region: 'tri-valley',
  windowDays: 30,
  cachedAt: '2026-07-23T00:00:00.000Z',
  priorAvailable: true,
  totalInvasiveObservations: 2,
  previousTotalInvasiveObservations: 3,
  totalInvasiveObservationsPct: -33.3,
  alerts: [
    {
      commonName: 'Yellow Starthistle',
      scientificName: 'Centaurea solstitialis',
      taxonId: 75990,
      observationCount: 2,
      previousObservationCount: 3,
      observationCountPct: -33.3,
      latestObservedOn: '2026-07-10',
      observations: [
        {
          id: 2001,
          lat: 37.67,
          lng: -121.8,
          obscured: false,
          publicPositionalAccuracy: 15,
          displayName: 'Yellow Starthistle',
          scientificName: 'Centaurea solstitialis',
          taxonId: 75990,
          iconicTaxon: 'Plantae',
          qualityGrade: 'research',
          observer: 'weed_scout',
          observerId: 55,
          observedOn: '2026-07-10',
          thumbnailUrl: null,
        },
      ],
    },
    {
      commonName: 'Nutria',
      scientificName: 'Myocastor coypus',
      taxonId: 43794,
      observationCount: 0,
      previousObservationCount: 0,
      observationCountPct: 0,
      latestObservedOn: null,
      observations: [],
    },
    {
      commonName: 'Tree of Heaven',
      scientificName: 'Ailanthus altissima',
      taxonId: 57963,
      observationCount: 0,
      previousObservationCount: 0,
      observationCountPct: 0,
      latestObservedOn: null,
      observations: [],
    },
    {
      commonName: 'Water Hyacinth',
      scientificName: 'Pontederia crassipes',
      taxonId: 60333,
      observationCount: 0,
      previousObservationCount: 0,
      observationCountPct: 0,
      latestObservedOn: null,
      observations: [],
    },
  ],
}

const mockLeaderboard = {
  region: 'tri-valley',
  windowDays: 30,
  cachedAt: '2026-07-23T00:00:00.000Z',
  observationSampleSize: 12,
  entries: [
    {
      rank: 1,
      observer: 'top_spotter',
      observerId: 101,
      observationCount: 8,
      uniqueSpecies: 5,
    },
    {
      rank: 2,
      observer: 'bird_nerd',
      observerId: 22,
      observationCount: 3,
      uniqueSpecies: 2,
    },
  ],
}

const mockTrends = {
  region: 'tri-valley',
  windowDays: 30,
  cachedAt: '2026-07-23T00:00:00.000Z',
  priorAvailable: true,
  appliedTaxa: [],
  current: {
    observationCount: 120,
    uniqueSpecies: 80,
    observerCount: 40,
    researchGradePercent: 55,
    invasiveCount: 2,
  },
  previous: {
    observationCount: 100,
    uniqueSpecies: 70,
    observerCount: 35,
    researchGradePercent: 50,
    invasiveCount: 3,
  },
  deltas: {
    observationCountPct: 20,
    uniqueSpeciesPct: 14.3,
    observerCountPct: 14.3,
    researchGradePercentPts: 5,
    invasiveCountPct: -33.3,
  },
  yearly: [
    { year: 2022, observationCount: 4200, uniqueSpecies: 900, observerCount: 200, isPartial: false },
    { year: 2023, observationCount: 5100, uniqueSpecies: 980, observerCount: 240, isPartial: false },
    { year: 2024, observationCount: 6300, uniqueSpecies: 1100, observerCount: 280, isPartial: false },
    { year: 2025, observationCount: 7000, uniqueSpecies: 1200, observerCount: 300, isPartial: false },
    { year: 2026, observationCount: 2100, uniqueSpecies: 500, observerCount: 120, isPartial: true },
  ],
  yearlyScaleMax: 7000,
  monthly: [
    { yearMonth: '2026-01', observationCount: 400, uniqueSpecies: 120, observerCount: 40 },
    { yearMonth: '2026-06', observationCount: 500, uniqueSpecies: 140, observerCount: 50 },
  ],
  backfillStatus: {
    yearsBack: 5,
    requiredMonths: 60,
    completeMonths: 60,
    pendingMonths: 0,
    complete: true,
  },
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/regions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRegions),
    })
  })
  await page.route('**/api/metrics**', async (route) => {
    const url = new URL(route.request().url())
    const taxaParam = url.searchParams.get('taxa')
    const appliedTaxa = taxaParam
      ? taxaParam.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...mockMetrics, appliedTaxa }),
    })
  })
  await page.route('**/api/observations**', async (route) => {
    const url = new URL(route.request().url())
    const taxaParam = url.searchParams.get('taxa')
    const appliedTaxa = taxaParam
      ? taxaParam.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    const observations =
      appliedTaxa.length === 0
        ? mockObservations.observations
        : mockObservations.observations.filter((o) => appliedTaxa.includes(o.iconicTaxon))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...mockObservations,
        appliedTaxa,
        count: observations.length,
        observations,
      }),
    })
  })
  await page.route('**/api/invasives**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockInvasives),
    })
  })
  await page.route('**/api/leaderboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockLeaderboard),
    })
  })
  await page.route('**/api/trends**', async (route) => {
    const url = new URL(route.request().url())
    const taxaParam = url.searchParams.get('taxa')
    const appliedTaxa = taxaParam
      ? taxaParam.split(',').map((t) => t.trim()).filter(Boolean)
      : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...mockTrends,
        appliedTaxa,
        yearly:
          appliedTaxa.length === 0
            ? mockTrends.yearly
            : mockTrends.yearly.map((y) => ({
                ...y,
                observationCount: Math.round(y.observationCount * 0.25),
              })),
      }),
    })
  })
})

test('dashboard loads brand, snapshot, trends, invasives, leaderboard, and map', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'WildWatchBoard' })).toBeVisible()
  await expect(page.getByTestId('time-window-toggle')).toBeVisible()
  await expect(page.getByRole('tab', { name: '30d' })).toBeVisible()
  await expect(page.getByTestId('region-snapshot')).toBeVisible()
  await expect(page.getByTestId('region-snapshot').getByText('Unique species')).toBeVisible()
  await expect(page.getByTestId('trends-panel')).toBeVisible()
  await expect(page.getByText('Comparable trends')).toBeVisible()
  await expect(page.getByTestId('yearly-history')).toBeVisible()
  await expect(page.getByText(/year history/i)).toBeVisible()
  await expect(page.getByTestId('invasive-watch')).toBeVisible()
  await expect(page.getByText('Yellow Starthistle')).toBeVisible()
  await expect(page.getByTestId('leaderboard')).toBeVisible()
  await expect(page.getByText('top_spotter')).toBeVisible()
  await expect(page.getByTestId('observation-map')).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()

  await page.getByRole('button', { name: /Birds/i }).click()
  await page.getByTestId('taxon-filter-apply').click()
  await expect(page.getByTestId('taxon-filter-banner')).toBeVisible()
  await expect(page.getByTestId('snapshot-summary')).toContainText('Filtered')
  await expect(page.getByTestId('trends-panel')).toContainText(/filtered to Birds/i)
  await expect(page.getByTestId('yearly-history')).toContainText(/filtered to Birds/i)
})
