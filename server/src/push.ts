import 'dotenv/config'
import webpush from 'web-push'
import { prisma } from './db.js'

/**
 * Web Push directo (VAPID), sin servicio externo.
 *
 * Elegí esto sobre OneSignal por una razón concreta: en iOS el push solo
 * funciona con la PWA agregada a la pantalla de inicio, así que hay que
 * construir manifest + service worker + flujo de instalación igual. Con el
 * service worker propio ya en la mano, el push directo son cuatro funciones y
 * nos ahorra una cuenta externa, un SDK y un tercero mirando a los usuarios.
 */

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hola@toptraining.app'

export const pushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY)
export const vapidPublicKey = PUBLIC_KEY ?? null

if (pushConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!)
}

export interface PushPayload {
  title: string
  body: string
  /** A dónde lleva el toque. Por defecto, directo a marcar. */
  url?: string
  tag?: string
}

/**
 * Manda el aviso a todos los dispositivos del usuario.
 * Devuelve cuántos salieron bien.
 *
 * Si el navegador contesta 404/410 la suscripción murió (desinstalaron la app,
 * limpiaron el sitio): la borramos ahí mismo para no arrastrar basura.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured) return 0

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subscriptions.length === 0) return 0

  const body = JSON.stringify(payload)
  let delivered = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        )
        delivered++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {})
        } else {
          console.error('[push] falló el envío:', status ?? error)
        }
      }
    }),
  )

  return delivered
}
