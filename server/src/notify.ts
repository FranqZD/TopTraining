import { prisma } from './db.js'
import { sendToUser } from './push.js'

/**
 * Avisos que dispara la gente, no el reloj (el recordatorio de entrenar vive
 * en scheduler.ts).
 *
 * Dos reglas que valen para todos:
 *
 *  - Nunca tumban el pedido que los originó. Se lanzan con `fireAndForget()`
 *    después de responder: que el push falle no puede volver un comentario
 *    guardado en un error en pantalla.
 *  - El `tag` agrupa lo repetido. Como el service worker manda `renotify:
 *    false`, un aviso que reemplaza a otro del mismo tag entra callado: por eso
 *    los votos usan tag por votante y post, y así el que se pone a prender y
 *    apagar el aura suena una sola vez.
 */

/** Lanza el aviso sin hacer esperar a quien lo disparó. */
export function fireAndForget(task: Promise<unknown>): void {
  void task.catch((error) => console.error('[push] aviso social falló:', error))
}

/** El cuerpo de un push no es una pantalla: lo largo se corta. */
function short(text: string, max = 120): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/**
 * Alguien de tus grupos marcó su entreno.
 *
 * Va a todos los que comparten grupo con el autor, uno por persona aunque
 * compartan tres grupos, y lleva al grupo donde se van a encontrar el post.
 */
export async function notifyNewCheckIn(checkIn: {
  id: string
  userId: string
  note: string | null
}): Promise<void> {
  const author = await prisma.user.findUnique({
    where: { id: checkIn.userId },
    select: { name: true },
  })
  if (!author) return

  const mine = await prisma.groupMember.findMany({
    where: { userId: checkIn.userId },
    select: { groupId: true },
  })
  if (mine.length === 0) return

  const members = await prisma.groupMember.findMany({
    where: { groupId: { in: mine.map((row) => row.groupId) }, userId: { not: checkIn.userId } },
    select: { userId: true, groupId: true },
  })

  const targets = new Map<string, string>()
  for (const member of members) {
    if (!targets.has(member.userId)) targets.set(member.userId, member.groupId)
  }

  await Promise.all(
    [...targets].map(([userId, groupId]) =>
      sendToUser(userId, {
        title: `${author.name} ya entrenó`,
        body: checkIn.note ? short(checkIn.note) : 'Marcó su entreno. ¿Y el tuyo?',
        url: `/groups/${groupId}`,
        tag: `post:${checkIn.id}`,
      }),
    ),
  )
}

/** Comentaron tu entreno. El aviso trae el comentario, no un "tienes 1 nuevo". */
export async function notifyComment(comment: {
  id: string
  body: string
  authorId: string
  checkInId: string
  ownerId: string
}): Promise<void> {
  if (comment.authorId === comment.ownerId) return

  const author = await prisma.user.findUnique({
    where: { id: comment.authorId },
    select: { name: true },
  })
  if (!author) return

  await sendToUser(comment.ownerId, {
    title: `${author.name} comentó tu entreno`,
    body: short(comment.body),
    url: `/u/${comment.ownerId}`,
    tag: `comment:${comment.id}`,
  })
}

/** Te votaron. Solo al ponerlo: sacarlo o moverlo a otro post no avisa nada. */
export async function notifyVote(vote: {
  checkInId: string
  ownerId: string
  voterId: string
  kind: 'like' | 'laura'
}): Promise<void> {
  if (vote.voterId === vote.ownerId) return

  const voter = await prisma.user.findUnique({
    where: { id: vote.voterId },
    select: { name: true },
  })
  if (!voter) return

  const aura = vote.kind === 'like'
  await sendToUser(vote.ownerId, {
    title: `${voter.name} te dio ${aura ? 'aura' : 'laura'}`,
    body: aura ? 'Tu entreno de hoy le gustó a alguien.' : 'No a todos les convenció tu entreno.',
    url: `/u/${vote.ownerId}`,
    tag: `vote:${vote.checkInId}:${vote.voterId}`,
  })
}

/** Te llegó una solicitud de amistad. */
export async function notifyFriendRequest(request: {
  requesterId: string
  addresseeId: string
}): Promise<void> {
  const requester = await prisma.user.findUnique({
    where: { id: request.requesterId },
    select: { name: true },
  })
  if (!requester) return

  await sendToUser(request.addresseeId, {
    title: `${requester.name} te quiere agregar`,
    body: 'Tienes una solicitud de amistad esperando.',
    url: '/friends',
    tag: `friend:${request.requesterId}`,
  })
}
