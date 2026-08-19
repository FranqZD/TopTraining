import { api } from './api'

/**
 * Suscripción a los recordatorios de entreno.
 *
 * La regla que manda todo este archivo: en iOS el push SOLO existe si la PWA
 * está agregada a la pantalla de inicio. Antes de eso `PushManager` ni
 * siquiera está definido, así que pedir permiso es imposible — y pedirlo en
 * el momento equivocado quema la única oportunidad que da el navegador.
 * Por eso primero detectamos si hay que instalar, y recién después ofrecemos
 * activar.
 */

export type PushState =
  | 'unsupported' // el navegador no soporta push (o iOS sin instalar)
  | 'needs-install' // hay que agregar la app a la pantalla de inicio primero
  | 'ready' // se puede pedir permiso
  | 'denied' // el usuario dijo que no
  | 'on' // suscripto y andando

/** ¿Está corriendo como app instalada y no como pestaña del navegador? */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS usa esta propiedad no estándar.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  // El iPad moderno se hace pasar por Mac: lo delata el touch.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(ua) || iPadOS
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Registra el service worker. Sin esto no hay push ni instalación. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** En qué punto del flujo está este dispositivo. */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    // En iOS la falta de soporte casi siempre significa "todavía no la instaló".
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  // Aunque el navegador soporte push, en iOS solo funciona ya instalada.
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'on' : 'ready'
}

/** Las claves VAPID viajan en base64url y el navegador las quiere en bytes. */
function decodeKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/**
 * Pide permiso y registra el dispositivo. Se llama SIEMPRE desde un botón,
 * nunca al abrir la app: el permiso se pide una sola vez y hay que gastarlo
 * cuando el usuario ya entendió para qué sirve.
 */
export async function enablePush(vapidPublicKey: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'ready'

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Sin esto los navegadores rechazan la suscripción: obligan a que cada
      // push muestre una notificación visible.
      userVisibleOnly: true,
      applicationServerKey: decodeKey(vapidPublicKey),
    }))

  await api.post('/push/subscribe', subscription.toJSON())
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription()
  if (!subscription) return 'ready'

  await api.post('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {})
  await subscription.unsubscribe().catch(() => {})
  return 'ready'
}
