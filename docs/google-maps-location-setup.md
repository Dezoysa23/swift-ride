# Google Maps and Location Setup

This project uses two Google Maps keys:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: browser-only key for map display and browser Places usage.
- `GOOGLE_MAPS_SERVER_API_KEY`: server-only key for API routes that calculate routes, geocode addresses, reverse-geocode coordinates, and estimate prices.

Never use `GOOGLE_MAPS_SERVER_API_KEY` in a client component or any `NEXT_PUBLIC_` variable.

## 1. Create the frontend key

1. Open Google Cloud Console.
2. Select the Swift Ride project or create one.
3. Enable billing for the project.
4. Enable these APIs:
   - Maps JavaScript API
   - Places API
5. Create an API key named `Swift Ride Frontend Maps Key`.
6. Set application restriction to `HTTP referrers`.
7. Add allowed referrers:
   - `http://localhost:3000/*`
   - `https://your-production-domain.com/*`
8. Set API restrictions to:
   - Maps JavaScript API
   - Places API
9. Add the value to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_frontend_browser_key
```

## 2. Create the server key

1. Create a second API key named `Swift Ride Server Maps Key`.
2. Enable these APIs:
   - Routes API
   - Geocoding API
3. Enable Places API too if the app will call `/api/maps/autocomplete`.
4. Set application restriction to IP address restriction when you have stable server IPs. For local development, keep it unrestricted temporarily and rely on API restrictions.
5. Set API restrictions to:
   - Routes API
   - Geocoding API
   - Places API, only if `/api/maps/autocomplete` is used
6. Add the value to `.env.local`:

```env
GOOGLE_MAPS_SERVER_API_KEY=your_backend_server_key
```

## 3. Configure fare estimation

These defaults are used by `/api/maps/estimate-price`:

```env
MAPS_PRICE_BASE_FARE=100
MAPS_PRICE_PER_KM=60
MAPS_PRICE_PER_MINUTE=5
MAPS_PRICE_SERVICE_FEE=0
MAPS_PRICE_MINIMUM_FARE=300
MAPS_PRICE_STANDARD_MULTIPLIER=1
MAPS_PRICE_COMFORT_MULTIPLIER=1.2
MAPS_PRICE_PREMIUM_MULTIPLIER=1.5
MAPS_PRICE_VAN_MULTIPLIER=1.8
```

Adjust them to match Swift Ride pricing.

## 4. Local development

1. Confirm `.env.local` contains both Maps keys.
2. Restart the dev server after changing env vars.
3. Run:

```bash
npm run dev
```

4. Open:
   - Passenger/driver map views that use browser maps
   - `/admin/live-map` for the admin operations view

## 5. Added API routes

Maps:

- `GET /api/maps/autocomplete?input=colombo&sessionToken=token&lat=6.9271&lng=79.8612`
- `GET /api/maps/geocode?address=Colombo`
- `GET /api/maps/reverse-geocode?lat=6.9271&lng=79.8612`
- `POST /api/maps/route`
- `POST /api/maps/estimate-price`

Route and price request body:

```json
{
  "origin": { "lat": 6.9271, "lng": 79.8612 },
  "destination": { "lat": 6.9061, "lng": 79.8708 },
  "rideType": "standard"
}
```

Location:

- `POST /api/location/driver/online`
- `POST /api/location/driver/update`
- `POST /api/location/driver/offline`
- `POST /api/location/passenger/pickup`
- `GET /api/admin/live-locations`
- `GET /api/admin/active-bookings-map`

Driver online/update body:

```json
{
  "lat": 6.9271,
  "lng": 79.8612,
  "accuracy": 20,
  "heading": 90,
  "speed": 12
}
```

Passenger pickup body:

```json
{
  "bookingId": "booking_object_id",
  "pickupAddress": "Colombo Fort Station",
  "pickupLat": 6.9344,
  "pickupLng": 79.8428,
  "accuracy": 20
}
```

## 6. Location policy

- Passenger pickup location is stored only when the passenger selects or shares it for an active booking.
- Driver location updates should run only when the driver is online or on an active trip.
- Use a 10-30 second interval during active trips.
- Use a 30-60 second interval while a driver is online but idle.
- Call `/api/location/driver/offline` when the driver disables availability.
- Admin live map excludes offline drivers.
- `LocationEvent` documents expire after 90 days to avoid unlimited location history.

## 7. Cost control

- The passenger pickup/drop-off component uses an autocomplete session token.
- Autocomplete input is debounced before calling `/api/maps/autocomplete`.
- Route and price estimation runs only after both pickup and drop-off are selected.
- Keep Google Cloud daily quotas and billing alerts enabled.
- Use separate development and production keys where possible.

## 8. Deployment notes

Set the same environment variables in your production host. If using Vercel, install the Vercel CLI with `npm i -g vercel`, then use `vercel env add` or the Vercel dashboard to set the keys for Production, Preview, and Development.
