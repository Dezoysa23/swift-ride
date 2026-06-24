import assert from 'node:assert/strict'
import {
  calculateEstimatedPrice,
  isLatLng,
  normalizeAutocompleteSuggestions,
  toAutocompleteRequestBody,
  normalizeGeocodeResults,
  normalizeRouteResult,
  parseGoogleDurationSeconds,
} from '../lib/maps/google-maps'

function test(name: string, fn: () => void) {
  fn()
  console.log(`ok - ${name}`)
}

test('isLatLng accepts valid coordinates and rejects impossible coordinates', () => {
  assert.equal(isLatLng({ lat: 6.9271, lng: 79.8612 }), true)
  assert.equal(isLatLng({ lat: -91, lng: 79.8612 }), false)
  assert.equal(isLatLng({ lat: 6.9271, lng: 181 }), false)
  assert.equal(isLatLng({ lat: '6.9271', lng: 79.8612 }), false)
})

test('parseGoogleDurationSeconds converts Google duration strings into seconds', () => {
  assert.equal(parseGoogleDurationSeconds('165s'), 165)
  assert.equal(parseGoogleDurationSeconds('0s'), 0)
  assert.equal(parseGoogleDurationSeconds('bad-value'), 0)
})

test('normalizeRouteResult returns distance, duration, and encoded polyline', () => {
  const route = normalizeRouteResult({
    routes: [
      {
        distanceMeters: 12500,
        duration: '1500s',
        polyline: { encodedPolyline: 'abc123' },
      },
    ],
  })

  assert.deepEqual(route, {
    distanceMeters: 12500,
    distanceKm: 12.5,
    durationSeconds: 1500,
    durationMinutes: 25,
    encodedPolyline: 'abc123',
  })
})

test('calculateEstimatedPrice rounds to two decimals with configurable fare inputs', () => {
  assert.equal(
    calculateEstimatedPrice({
      distanceKm: 12.5,
      durationMinutes: 25,
      baseFare: 100,
      perKm: 60,
      perMinute: 5,
      minimumFare: 300,
    }),
    975
  )

  assert.equal(
    calculateEstimatedPrice({
      distanceKm: 1,
      durationMinutes: 2,
      baseFare: 50,
      perKm: 20,
      perMinute: 5,
      minimumFare: 100,
    }),
    100
  )
})

test('calculateEstimatedPrice applies service fee and ride type multiplier', () => {
  assert.equal(
    calculateEstimatedPrice({
      distanceKm: 10,
      durationMinutes: 20,
      baseFare: 100,
      perKm: 50,
      perMinute: 5,
      serviceFee: 25,
      minimumFare: 200,
      rideTypeMultiplier: 1.5,
    }),
    1087.5
  )
})

test('toAutocompleteRequestBody includes session token and location bias when available', () => {
  assert.deepEqual(toAutocompleteRequestBody('Colombo', 'session-123', { lat: 6.9271, lng: 79.8612 }), {
    input: 'Colombo',
    includeQueryPredictions: true,
    sessionToken: 'session-123',
    origin: {
      latitude: 6.9271,
      longitude: 79.8612,
    },
    locationBias: {
      circle: {
        center: {
          latitude: 6.9271,
          longitude: 79.8612,
        },
        radius: 50000,
      },
    },
  })
})

test('normalizeGeocodeResults keeps only fields the app needs', () => {
  const results = normalizeGeocodeResults({
    results: [
      {
        formatted_address: 'Colombo, Sri Lanka',
        place_id: 'place-1',
        geometry: {
          location: { lat: 6.9271, lng: 79.8612 },
        },
        types: ['locality'],
      },
    ],
    status: 'OK',
  })

  assert.deepEqual(results, [
    {
      address: 'Colombo, Sri Lanka',
      placeId: 'place-1',
      lat: 6.9271,
      lng: 79.8612,
      types: ['locality'],
    },
  ])
})

test('normalizeAutocompleteSuggestions handles place and query predictions', () => {
  const suggestions = normalizeAutocompleteSuggestions({
    suggestions: [
      {
        placePrediction: {
          placeId: 'place-1',
          text: { text: 'Colombo Fort Station' },
          structuredFormat: {
            mainText: { text: 'Colombo Fort Station' },
            secondaryText: { text: 'Colombo, Sri Lanka' },
          },
          types: ['transit_station'],
        },
      },
      {
        queryPrediction: {
          text: { text: 'airport near colombo' },
        },
      },
    ],
  })

  assert.deepEqual(suggestions, [
    {
      placeId: 'place-1',
      description: 'Colombo Fort Station',
      mainText: 'Colombo Fort Station',
      secondaryText: 'Colombo, Sri Lanka',
      types: ['transit_station'],
    },
    {
      placeId: null,
      description: 'airport near colombo',
      mainText: 'airport near colombo',
      secondaryText: '',
      types: [],
    },
  ])
})
