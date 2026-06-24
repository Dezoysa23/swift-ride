export interface LatLng {
  lat: number
  lng: number
}

export interface NormalizedRoute {
  distanceMeters: number
  distanceKm: number
  durationSeconds: number
  durationMinutes: number
  encodedPolyline: string | null
}

export interface PriceInputs {
  distanceKm: number
  durationMinutes: number
  baseFare: number
  perKm: number
  perMinute: number
  serviceFee?: number
  minimumFare: number
  rideTypeMultiplier?: number
}

export interface NormalizedGeocodeResult {
  address: string
  placeId: string
  lat: number
  lng: number
  types: string[]
}

export interface NormalizedAutocompleteSuggestion {
  placeId: string | null
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

interface GoogleGeocodeResponse {
  results?: Array<{
    formatted_address?: string
    place_id?: string
    geometry?: {
      location?: {
        lat?: number
        lng?: number
      }
    }
    types?: string[]
  }>
  status?: string
  error_message?: string
}

interface GoogleRouteResponse {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
    polyline?: {
      encodedPolyline?: string
    }
  }>
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
      types?: string[]
    }
    queryPrediction?: {
      text?: { text?: string }
    }
  }>
}

export function isLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lat) &&
    Number.isFinite(candidate.lng) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  )
}

export function parseGoogleDurationSeconds(duration: unknown): number {
  if (typeof duration !== 'string') return 0
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/)
  return match ? Number(match[1]) : 0
}

export function normalizeRouteResult(response: GoogleRouteResponse): NormalizedRoute | null {
  const route = response.routes?.[0]
  if (!route || typeof route.distanceMeters !== 'number') return null

  const durationSeconds = parseGoogleDurationSeconds(route.duration)
  return {
    distanceMeters: route.distanceMeters,
    distanceKm: route.distanceMeters / 1000,
    durationSeconds,
    durationMinutes: durationSeconds / 60,
    encodedPolyline: route.polyline?.encodedPolyline ?? null,
  }
}

export function calculateEstimatedPrice(inputs: PriceInputs): number {
  const raw =
    inputs.baseFare +
    inputs.distanceKm * inputs.perKm +
    inputs.durationMinutes * inputs.perMinute +
    (inputs.serviceFee ?? 0)

  const multiplier = inputs.rideTypeMultiplier ?? 1

  return Math.round(Math.max(inputs.minimumFare, raw * multiplier) * 100) / 100
}

export function normalizeGeocodeResults(response: GoogleGeocodeResponse): NormalizedGeocodeResult[] {
  return (response.results ?? [])
    .map((result) => {
      const location = result.geometry?.location
      if (
        !result.formatted_address ||
        !result.place_id ||
        typeof location?.lat !== 'number' ||
        typeof location.lng !== 'number'
      ) {
        return null
      }

      return {
        address: result.formatted_address,
        placeId: result.place_id,
        lat: location.lat,
        lng: location.lng,
        types: result.types ?? [],
      }
    })
    .filter((result): result is NormalizedGeocodeResult => result !== null)
}

export function normalizeAutocompleteSuggestions(
  response: GoogleAutocompleteResponse
): NormalizedAutocompleteSuggestion[] {
  return (response.suggestions ?? [])
    .map((suggestion) => {
      const place = suggestion.placePrediction
      if (place) {
        const description = place.text?.text ?? ''
        if (!description) return null

        return {
          placeId: place.placeId ?? null,
          description,
          mainText: place.structuredFormat?.mainText?.text ?? description,
          secondaryText: place.structuredFormat?.secondaryText?.text ?? '',
          types: place.types ?? [],
        }
      }

      const query = suggestion.queryPrediction?.text?.text ?? ''
      if (!query) return null

      return {
        placeId: null,
        description: query,
        mainText: query,
        secondaryText: '',
        types: [],
      }
    })
    .filter((suggestion): suggestion is NormalizedAutocompleteSuggestion => suggestion !== null)
}

export function getServerMapsApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_SERVER_API_KEY is not configured')
  }
  return apiKey
}

async function fetchGoogleJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = (await response.json()) as T & { error?: { message?: string }; error_message?: string }

  if (!response.ok) {
    const message = data.error?.message ?? data.error_message ?? 'Google Maps request failed'
    throw new Error(message)
  }

  return data
}

export async function geocodeAddress(address: string): Promise<NormalizedGeocodeResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', getServerMapsApiKey())

  const data = await fetchGoogleJson<GoogleGeocodeResponse>(url.toString())
  return normalizeGeocodeResults(data)
}

export async function reverseGeocode(latLng: LatLng): Promise<NormalizedGeocodeResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('latlng', `${latLng.lat},${latLng.lng}`)
  url.searchParams.set('key', getServerMapsApiKey())

  const data = await fetchGoogleJson<GoogleGeocodeResponse>(url.toString())
  return normalizeGeocodeResults(data)
}

function toRouteWaypoint(location: LatLng) {
  return {
    location: {
      latLng: {
        latitude: location.lat,
        longitude: location.lng,
      },
    },
  }
}

export async function computeDrivingRoute(origin: LatLng, destination: LatLng): Promise<NormalizedRoute> {
  const data = await fetchGoogleJson<GoogleRouteResponse>(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getServerMapsApiKey(),
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: toRouteWaypoint(origin),
        destination: toRouteWaypoint(destination),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        units: 'METRIC',
      }),
    }
  )

  const route = normalizeRouteResult(data)
  if (!route) throw new Error('Google Routes API returned no route')
  return route
}

export function toAutocompleteRequestBody(input: string, sessionToken?: string, origin?: LatLng) {
  const body: Record<string, unknown> = {
    input,
    includeQueryPredictions: true,
  }

  if (sessionToken) {
    body.sessionToken = sessionToken
  }

  if (origin) {
    body.origin = {
      latitude: origin.lat,
      longitude: origin.lng,
    }
    body.locationBias = {
      circle: {
        center: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
        radius: 50000,
      },
    }
  }

  return body
}

export async function autocompletePlaces(input: string, origin?: LatLng, sessionToken?: string) {
  const body = toAutocompleteRequestBody(input, sessionToken, origin)

  const data = await fetchGoogleJson<GoogleAutocompleteResponse>(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getServerMapsApiKey(),
      },
      body: JSON.stringify(body),
    }
  )

  return normalizeAutocompleteSuggestions(data)
}
