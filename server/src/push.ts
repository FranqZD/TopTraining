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
 * Los tipos de aviso que existen. Cada uno tiene su interruptor en Ajustes,
 * salvo la prueba, que el usuario pide apretando un botón.
 *
 * El filtro vive acá y no en cada quien manda: así un aviso nuevo no puede
 * "olvidarse" de respetar el interruptor — sin kind no compila.
 */
const PREF_FIELD = {
  nudge: 'notifyNudge',
  post: 'notifyPosts',
  comment: 'notifyComments',
  vote: 'notifyVotes',
  friend: 'notifyFriends',
  test: null,
} as const

export type PushKind = keyof typeof PREF_FIELD

/** Manda el aviso a un usuario. Devuelve cuántos dispositivos lo recibieron. */
export function sendToUser(userId: string, payload: PushPayload, kind: PushKind): Promise<number> {
  return sendToUsers([userId], payload, kind)
}

/**
 * El mismo aviso a varias personas: se resuelve con dos consultas, no con una
 * por destinatario. Los que tienen ese tipo apagado quedan afuera.
 *
 * Si el navegador contesta 404/410 la suscripción murió (desinstalaron la app,
 * limpiaron el sitio): la borramos ahí mismo para no arrastrar basura.
 */
export async function sendToUsers(
  userIds: string[],
  payload: PushPayload,
  kind: PushKind,
): Promise<number> {
  if (!pushConfigured || userIds.length === 0) return 0

  const pref = PREF_FIELD[kind]
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: userIds },
      ...(pref ? { user: { [pref]: true } } : {}),
    },
  })
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
