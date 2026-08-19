/**
 * Service worker de Top Training.
 *
 * Su única responsabilidad hoy es el push: recibir el aviso y abrir la app en
 * la pantalla de check-in cuando lo tocan. No cachea nada todavía — el modo
 * offline es otra fase, y un caché a medias es peor que ninguno.
 *
 * OJO: este archivo se sirve desde la raíz a propósito. Un service worker solo
 * controla su propio directorio hacia abajo, así que tiene que vivir en "/".
 */

self.addEventListener('install', () => {
  // Activamos la versión nueva sin esperar a que cierren todas las pestañas.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Top Training'
  const options = {
    body: payload.body || 'Todavía estás a tiempo de entrenar hoy.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Un solo aviso a la vez: si llega otro, reemplaza al anterior.
    tag: payload.tag || 'toptraining',
    renotify: false,
    data: { url: payload.url || '/checkin' },
    actions: [{ action: 'checkin', title: 'Marcar entreno' }],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/checkin'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta, la traemos al frente en vez de abrir otra.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
