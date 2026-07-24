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
  cachedAt: '2026-07-23T00:00:00.000Z',
}

const mockObservations = {
  region: 'tri-valley',
  windowDays: 30,
  cachedAt: '2026-07-23T00:00:00.000Z',
  count: 3,
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

test.beforeEach(async ({ page }) => {
  await page.route('**/api/regions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRegions),
    })
  })
  await page.route('**/api/metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMetrics),
    })
  })
  await page.route('**/api/observations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockObservations),
    })
  })
})

test('dashboard loads brand, snapshot, and map', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'WildWatchBoard' })).toBeVisible()
  await expect(page.getByTestId('region-snapshot')).toBeVisible()
  await expect(page.getByText('Unique species')).toBeVisible()
  await expect(page.getByTestId('observation-map')).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()
})
