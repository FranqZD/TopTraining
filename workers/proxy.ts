/**
 * Proxy /api → Render. El browser sigue en el mismo origen (cookie SameSite=Lax).
 *
 * En el plan nuevo de Pages/Workers, `_redirects` con 200 a una URL absoluta
 * ya no está permitido. Este Worker hace el fetch del lado de Cloudflare.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  API_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url)
    if (!incoming.pathname.startsWith('/api')) {
      return env.ASSETS.fetch(request)
    }

    const origin = env.API_ORIGIN.replace(/\/+$/, '')
    const outgoing = new URL(incoming.pathname + incoming.search, origin)

    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('x-forwarded-host', incoming.host)
    headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''))

    const init: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
      redirect: 'manual',
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body
      init.duplex = 'half'
    }

    return fetch(outgoing, init)
  },
}
