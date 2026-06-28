export async function register() {
  // NEXT_RUNTIME is only set for edge runtime. For Node.js (the default), it is undefined.
  // We must NOT run this in the edge runtime (no dns module there).
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // The local network DNS refuses SRV queries needed for mongodb+srv:// URIs.
    // Google's public DNS supports them. This must run at process start, before any DB connection.
    const dns = await import('dns')
    dns.setServers(['8.8.8.8', '8.8.4.4'])
    console.log('[instrumentation] DNS servers set to Google public DNS')

    validateEnv()
  }
}

// Surface misconfiguration loudly at startup. MONGODB_URI and JWT_SECRET are hard
// failures (enforced in lib/db.ts and lib/auth.ts). The rest are warned about in
// production so a deploy missing email/maps/app-url config is obvious in the logs.
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) return

  const recommended: Record<string, string> = {
    NEXT_PUBLIC_APP_URL: 'password-reset links and Stripe redirects',
    RESEND_API_KEY: 'sending verification + password-reset emails',
    EMAIL_FROM: 'email sender address',
    GOOGLE_MAPS_SERVER_API_KEY: 'server-side routing/geocoding',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'client-side map + autocomplete',
    STRIPE_SECRET_KEY: 'payments',
    STRIPE_WEBHOOK_SECRET: 'verifying Stripe webhooks',
  }

  const missing = Object.keys(recommended).filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(
      `[instrumentation] WARNING: missing production env vars: ${missing.join(', ')}. ` +
        'Dependent features will not work until these are set.'
    )
  }
}
