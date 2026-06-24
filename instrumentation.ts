export async function register() {
  // NEXT_RUNTIME is only set for edge runtime. For Node.js (the default), it is undefined.
  // We must NOT run this in the edge runtime (no dns module there).
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // The local network DNS refuses SRV queries needed for mongodb+srv:// URIs.
    // Google's public DNS supports them. This must run at process start, before any DB connection.
    const dns = await import('dns')
    dns.setServers(['8.8.8.8', '8.8.4.4'])
    console.log('[instrumentation] DNS servers set to Google public DNS')
  }
}
