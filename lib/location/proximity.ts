import type { ProximityNotificationState } from '@/lib/models/Booking'

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Haversine great-circle distance between two points.
 * Returns distance in metres.
 */
export function calculateHaversineDistance(a: LatLng, b: LatLng): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
}

/**
 * Rough ETA estimate when a real Routes API ETA is not available.
 * Assumes average urban speed of 25 km/h.
 */
export function estimateEtaMinutes(distanceMeters: number): number {
  const avgSpeedKmh = 25
  return (distanceMeters / 1000 / avgSpeedKmh) * 60
}

/**
 * Derive the notification state from distance and ETA.
 * Thresholds:
 *   arrived          ≤ 150 m
 *   driver_2_min     ≤ 2 min ETA  (and > arrived threshold)
 *   driver_5_min     ≤ 5 min ETA
 *   driver_getting_closer — distance decreased by ≥ 20 % from last recorded
 *   driver_on_way    — default when driver has tripStatus on_the_way
 *   driver_assigned  — default when first assigned
 */
export function determineProximityState(
  distanceMeters: number,
  etaMinutes: number,
  prevDistanceMeters?: number
): ProximityNotificationState {
  if (distanceMeters <= 150) return 'driver_arrived'
  if (etaMinutes <= 2) return 'driver_2_min_away'
  if (etaMinutes <= 5) return 'driver_5_min_away'
  if (
    prevDistanceMeters !== undefined &&
    prevDistanceMeters > 0 &&
    distanceMeters < prevDistanceMeters * 0.8
  ) {
    return 'driver_getting_closer'
  }
  return 'driver_on_way'
}

/**
 * Returns true when a new notification should be sent.
 * Rules:
 *   - Always notify on first state transition
 *   - Never re-send the same state
 *   - Never downgrade state (e.g. from 2_min back to 5_min)
 *   - Minimum 60 seconds between any two notifications
 */

const STATE_ORDER: ProximityNotificationState[] = [
  'driver_assigned',
  'driver_on_way',
  'driver_getting_closer',
  'driver_5_min_away',
  'driver_2_min_away',
  'driver_arrived',
]

export function shouldSendNotification(
  newState: ProximityNotificationState,
  lastState: ProximityNotificationState | undefined,
  lastNotifiedAt: Date | undefined
): boolean {
  if (!lastState) return true
  if (newState === lastState) return false

  const newIdx = STATE_ORDER.indexOf(newState)
  const lastIdx = STATE_ORDER.indexOf(lastState)
  // Only progress forward in the state chain
  if (newIdx <= lastIdx) return false

  // Throttle: at least 60 s between notifications
  if (lastNotifiedAt) {
    const elapsed = Date.now() - lastNotifiedAt.getTime()
    if (elapsed < 60_000) return false
  }

  return true
}

/**
 * Human-readable message for each proximity state.
 */
export function proximityMessage(state: ProximityNotificationState): string {
  const messages: Record<ProximityNotificationState, string> = {
    driver_assigned: 'Your driver has been assigned',
    driver_on_way: 'Your driver is on the way',
    driver_getting_closer: 'Your driver is getting closer',
    driver_5_min_away: 'Your driver is about 5 minutes away',
    driver_2_min_away: 'Your driver is almost there',
    driver_arrived: 'Your driver has arrived',
  }
  return messages[state]
}
