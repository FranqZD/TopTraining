import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node'
import { z } from 'zod'
import { auth, enabledProviders } from './auth.js'
import { prisma } from './db.js'
import { generateGroupCode } from './codes.js'
import { createUploadSignature, isOwnCloudinaryUrl, storageConfigured } from './storage.js'
import { computeStreaks, shiftDay, summarizeWeeks, weekStart } from './streaks.js'
import type { Request, Response, NextFunction } from 'express'

const PORT = Number(process.env.PORT ?? 8787)
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

const app = express()

// En dev el frontend entra por el proxy de Vite (same-origin), pero dejamos
// CORS con credenciales listo para cuando el frontend se sirva desde otro host.
app.use(cors({ origin: APP_URL, credentials: true }))

// IMPORTANTE: el handler de better-auth va ANTES de express.json(),
// si no el cliente se queda colgado en "pending".
app.all('/api/auth/{*any}', toNodeHandler(auth))

app.use(express.json())

/* ---------------------------------------------------------------------------
   Sesión
   ------------------------------------------------------------------------- */

type SessionUser = { id: string }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session?.user) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }
  req.userId = (session.user as SessionUser).id
  next()
}

/** Campos del perfil que el frontend puede leer. Nunca devolvemos hashes. */
const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  theme: true,
  trainingSlot: true,
  targetWeightKg: true,
  weeklyFrequency: true,
  friendCode: true,
  onboardingCompleted: true,
} as const

/* ---------------------------------------------------------------------------
   Config pública — qué proveedores sociales están realmente configurados
   ------------------------------------------------------------------------- */

app.get('/api/config', (_req, res) => {
  res.json({ providers: enabledProviders, photoUploads: storageConfigured })
})

/* ---------------------------------------------------------------------------
   Perfil
   ------------------------------------------------------------------------- */

const THEMES = ['ember', 'voltage', 'plasma', 'magma', 'pulse'] as const
const SLOTS = ['morning', 'afternoon', 'night'] as const

const profilePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(30).optional(),
    theme: z.enum(THEMES).optional(),
    trainingSlot: z.enum(SLOTS).optional(),
    targetWeightKg: z.number().min(30).max(300).optional(),
    weeklyFrequency: z.number().int().min(1).max(7).optional(),
    onboardingCompleted: z.boolean().optional(),
  })
  .strict()

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: PROFILE_SELECT })
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' })
    return
  }
  res.json(user)
})

app.patch('/api/me', requireAuth, async (req, res) => {
  const parsed = profilePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(parsed.error) })
    return
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
    select: PROFILE_SELECT,
  })
  res.json(user)
})

/* ---------------------------------------------------------------------------
   Helpers de rachas y permisos
   ------------------------------------------------------------------------- */

/** Ventana suficiente para cualquier racha razonable, sin traer años de datos. */
const STREAK_WINDOW_DAYS = 400

/**
 * El día "hoy" lo define el cliente (su zona horaria), igual que al marcar.
 * Si no lo manda, caemos al del servidor.
 */
function todayFor(req: Request): string {
  const raw = String(req.query.today ?? '')
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10)
}

function groupDaysByUser(rows: { userId: string; day: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const list = map.get(row.userId)
    if (list) list.push(row.day)
    else map.set(row.userId, [row.day])
  }
  return map
}

/** ¿Es miembro de este grupo? Devuelve la membresía o null. */
async function membershipOf(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } })
}

/** ¿Comparten al menos un grupo? Es el permiso para ver y comentar check-ins. */
async function sharesGroup(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return true
  const shared = await prisma.groupMember.findFirst({
    where: { userId: userA, group: { members: { some: { userId: userB } } } },
    select: { id: true },
  })
  return Boolean(shared)
}

/* ---------------------------------------------------------------------------
   Amigos — con solicitud: pending -> accepted
   ------------------------------------------------------------------------- */

const FRIEND_SELECT = { id: true, name: true, image: true, friendCode: true } as const

/** Amigos de verdad: solicitudes aceptadas, mire para donde mire la fila. */
async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: { select: FRIEND_SELECT }, addressee: { select: FRIEND_SELECT } },
    orderBy: { respondedAt: 'desc' },
  })
  return rows.map((row) => (row.requesterId === userId ? row.addressee : row.requester))
}

/**
 * Amigos con su racha ya calculada: la lista se mira de un vistazo y no
 * queremos que el cliente dispare una consulta por amigo.
 */
app.get('/api/friends', requireAuth, async (req, res) => {
  const friends = await listFriends(req.userId!)
  if (friends.length === 0) {
    res.json([])
    return
  }

  const ids = friends.map((friend) => friend.id)
  const today = todayFor(req)

  const [checkIns, profiles] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: { in: ids }, day: { gte: shiftDay(today, -STREAK_WINDOW_DAYS) } },
      select: { userId: true, day: true },
    }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, weeklyFrequency: true } }),
  ])

  const daysByUser = groupDaysByUser(checkIns)
  const goalByUser = new Map(profiles.map((p) => [p.id, p.weeklyFrequency ?? 0]))

  res.json(
    friends.map((friend) => ({
      ...friend,
      streaks: computeStreaks(daysByUser.get(friend.id) ?? [], goalByUser.get(friend.id) ?? 0, today),
    })),
  )
})

/** Bandeja: lo que me mandaron y lo que mandé, todo pendiente. */
app.get('/api/friends/requests', requireAuth, async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: req.userId, status: 'pending' },
      select: { id: true, createdAt: true, requester: { select: FRIEND_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: req.userId, status: 'pending' },
      select: { id: true, createdAt: true, addressee: { select: FRIEND_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  res.json({
    incoming: incoming.map((r) => ({ id: r.id, createdAt: r.createdAt, user: r.requester })),
    outgoing: outgoing.map((r) => ({ id: r.id, createdAt: r.createdAt, user: r.addressee })),
  })
})

const requestSchema = z
  .object({
    userId: z.string().min(1).optional(),
    code: z.string().trim().min(4).max(12).optional(),
  })
  .refine((data) => Boolean(data.userId) !== Boolean(data.code), {
    message: 'Mandá userId o code, no los dos',
  })

app.post('/api/friends/request', requireAuth, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Pedido inválido' })
    return
  }

  const target = parsed.data.code
    ? await prisma.user.findUnique({
        where: { friendCode: parsed.data.code.toUpperCase() },
        select: FRIEND_SELECT,
      })
    : await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: FRIEND_SELECT })

  if (!target) {
    res.status(404).json({ error: parsed.data.code ? 'No encontramos a nadie con ese código' : 'Ese usuario no existe' })
    return
  }
  if (target.id === req.userId) {
    res.status(400).json({ error: 'No podés agregarte a vos mismo' })
    return
  }

  // Si ya me habían mandado solicitud, aceptarla es lo que el usuario quiere:
  // pedirle que vaya a la bandeja a confirmar sería hacerle dar una vuelta al pedo.
  const reverse = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: target.id, addresseeId: req.userId! } },
  })
  if (reverse) {
    if (reverse.status === 'pending') {
      await prisma.friendship.update({
        where: { id: reverse.id },
        data: { status: 'accepted', respondedAt: new Date() },
      })
    }
    res.json({ status: 'accepted', user: target })
    return
  }

  const existing = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: req.userId!, addresseeId: target.id } },
  })
  if (existing) {
    res.json({ status: existing.status, user: target })
    return
  }

  await prisma.friendship.create({ data: { requesterId: req.userId!, addresseeId: target.id } })
  res.json({ status: 'pending', user: target })
})

/** Aceptar / rechazar. Solo el destinatario puede responder su solicitud. */
async function respondToRequest(req: Request, res: Response, accept: boolean) {
  const request = await prisma.friendship.findUnique({ where: { id: String(req.params.id) } })
  if (!request || request.addresseeId !== req.userId || request.status !== 'pending') {
    res.status(404).json({ error: 'Esa solicitud no existe' })
    return
  }
  if (accept) {
    await prisma.friendship.update({
      where: { id: request.id },
      data: { status: 'accepted', respondedAt: new Date() },
    })
  } else {
    // Rechazar borra la fila: así el otro puede volver a intentarlo más adelante.
    await prisma.friendship.delete({ where: { id: request.id } })
  }
  res.json({ ok: true })
}

app.post('/api/friends/requests/:id/accept', requireAuth, (req, res) => respondToRequest(req, res, true))
app.post('/api/friends/requests/:id/decline', requireAuth, (req, res) => respondToRequest(req, res, false))

/** Búsqueda por nombre o código. En SQLite `contains` ya ignora mayúsculas. */
app.get('/api/users/search', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 2) {
    res.json([])
    return
  }
  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      OR: [{ name: { contains: q } }, { friendCode: q.toUpperCase() }],
    },
    select: FRIEND_SELECT,
    take: 10,
  })

  const ids = users.map((u) => u.id)
  const links = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: req.userId, addresseeId: { in: ids } },
        { addresseeId: req.userId, requesterId: { in: ids } },
      ],
    },
  })

  res.json(
    users.map((user) => {
      const link = links.find((l) => l.requesterId === user.id || l.addresseeId === user.id)
      const relation = !link
        ? 'none'
        : link.status === 'accepted'
          ? 'friends'
          : link.requesterId === req.userId
            ? 'pending_out'
            : 'pending_in'
      return { ...user, relation }
    }),
  )
})

/* ---------------------------------------------------------------------------
   Grupos
   ------------------------------------------------------------------------- */

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(40),
  baseGoal: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  /** Amigos ya aceptados que entran al grupo desde el arranque. */
  friendIds: z.array(z.string().min(1)).max(50).default([]),
})

/** Vista de grupo para las listas: lo que la Home necesita y nada más. */
function groupSummary(
  group: { id: string; name: string; baseGoal: number; inviteCode: string; ownerId: string; _count: { members: number } },
  membership: { personalGoal: number | null; role: string },
) {
  return {
    id: group.id,
    name: group.name,
    baseGoal: group.baseGoal,
    inviteCode: group.inviteCode,
    memberCount: group._count.members,
    isOwner: group.ownerId !== null && membership.role === 'owner',
    personalGoal: membership.personalGoal,
    /** Lo que realmente le exigimos a este usuario en este grupo. */
    effectiveGoal: membership.personalGoal ?? group.baseGoal,
  }
}

app.get('/api/groups', requireAuth, async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.userId },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: 'asc' },
  })
  res.json(memberships.map((m) => groupSummary(m.group, m)))
})

app.post('/api/groups', requireAuth, async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(parsed.error) })
    return
  }
  const { name, baseGoal, friendIds } = parsed.data

  // Solo entran los que ya son amigos aceptados: la lista del cliente no manda.
  const friends = await listFriends(req.userId!)
  const allowed = friendIds.filter((id) => friends.some((friend) => friend.id === id))

  const group = await prisma.group.create({
    data: {
      name,
      baseGoal,
      ownerId: req.userId!,
      inviteCode: await generateGroupCode(),
      members: {
        create: [
          { userId: req.userId!, role: 'owner' },
          ...allowed.map((userId) => ({ userId })),
        ],
      },
    },
    include: { _count: { select: { members: true } } },
  })

  res.status(201).json(groupSummary(group, { personalGoal: null, role: 'owner' }))
})

app.post('/api/groups/join', requireAuth, async (req, res) => {
  const parsed = z.object({ code: z.string().trim().min(4).max(12) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Código inválido' })
    return
  }
  const group = await prisma.group.findUnique({ where: { inviteCode: parsed.data.code.toUpperCase() } })
  if (!group) {
    res.status(404).json({ error: 'No existe ningún grupo con ese código' })
    return
  }

  // Idempotente: entrar de nuevo con el mismo código no duplica la membresía.
  const membership = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    create: { groupId: group.id, userId: req.userId! },
    update: {},
  })

  // El conteo se lee después del alta, si no quedaría desfasado al reingresar.
  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } })
  res.json(groupSummary({ ...group, _count: { members: memberCount } }, membership))
})

app.get('/api/groups/:id', requireAuth, async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: String(req.params.id) },
    include: {
      _count: { select: { members: true } },
      members: { include: { user: { select: FRIEND_SELECT } }, orderBy: { joinedAt: 'asc' } },
    },
  })
  const mine = group?.members.find((member) => member.userId === req.userId)
  if (!group || !mine) {
    res.status(404).json({ error: 'Ese grupo no existe o no sos miembro' })
    return
  }

  res.json({
    ...groupSummary(group, mine),
    members: group.members.map((member) => ({
      ...member.user,
      role: member.role,
      personalGoal: member.personalGoal,
      effectiveGoal: member.personalGoal ?? group.baseGoal,
      isMe: member.userId === req.userId,
    })),
  })
})

/** Meta personal: pisa la del grupo. `null` vuelve a heredar la base. */
app.patch('/api/groups/:id/me', requireAuth, async (req, res) => {
  const parsed = z
    .object({ personalGoal: z.number().int().min(1).max(7).nullable() })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Meta inválida' })
    return
  }
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: String(req.params.id), userId: req.userId! } },
    include: { group: { include: { _count: { select: { members: true } } } } },
  })
  if (!membership) {
    res.status(404).json({ error: 'No sos miembro de ese grupo' })
    return
  }

  const updated = await prisma.groupMember.update({
    where: { id: membership.id },
    data: { personalGoal: parsed.data.personalGoal },
  })
  res.json(groupSummary(membership.group, updated))
})

/* ---------------------------------------------------------------------------
   Feed y calendario del grupo
   ------------------------------------------------------------------------- */

/**
 * Feed del grupo: check-ins de todos los miembros, del más nuevo al más viejo,
 * paginado con cursor (no con offset, que se desordena cuando alguien marca
 * mientras vos scrolleás).
 */
app.get('/api/groups/:id/feed', requireAuth, async (req, res) => {
  const groupId = String(req.params.id)
  if (!(await membershipOf(groupId, req.userId!))) {
    res.status(404).json({ error: 'Ese grupo no existe o no sos miembro' })
    return
  }

  const limit = Math.min(Math.max(Number(req.query.limit ?? 25) || 25, 1), 30)
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined

  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })
  const memberIds = members.map((member) => member.userId)

  const rows = await prisma.checkIn.findMany({
    where: { userId: { in: memberIds } },
    // Ordena por el día ENTRENADO, no por cuándo se creó la fila: si alguien
    // marca hoy un rato tarde tiene que aparecer arriba igual.
    orderBy: [{ day: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: FRIEND_SELECT }, _count: { select: { comments: true } } },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  // La racha se calcula solo para los autores que aparecen en esta página.
  const today = todayFor(req)
  const authorIds = [...new Set(page.map((row) => row.userId))]
  const [history, profiles] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: { in: authorIds }, day: { gte: shiftDay(today, -STREAK_WINDOW_DAYS) } },
      select: { userId: true, day: true },
    }),
    prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, weeklyFrequency: true } }),
  ])
  const daysByUser = groupDaysByUser(history)
  const goalByUser = new Map(profiles.map((profile) => [profile.id, profile.weeklyFrequency ?? 0]))

  res.json({
    items: page.map((row) => ({
      id: row.id,
      day: row.day,
      note: row.note,
      photoUrl: row.photoUrl,
      createdAt: row.createdAt,
      commentCount: row._count.comments,
      author: row.user,
      streaks: computeStreaks(daysByUser.get(row.userId) ?? [], goalByUser.get(row.userId) ?? 0, today),
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  })
})

/**
 * Calendario mensual de un miembro. Devuelve la grilla ya resuelta por el
 * servidor: qué días tienen check-in y, por cada semana, si llegó a la meta
 * (la personal del miembro en este grupo, o la base del grupo si no tiene).
 *
 * Las semanas se calculan sobre la grilla completa (lunes a domingo), que
 * empieza antes y termina después del mes: si no, una semana partida entre
 * dos meses daría "no cumplió" por contar solo la mitad de sus días.
 */
app.get('/api/groups/:id/calendar', requireAuth, async (req, res) => {
  const groupId = String(req.params.id)
  const parsed = z
    .object({
      userId: z.string().min(1).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato esperado YYYY-MM'),
    })
    .safeParse({ userId: req.query.userId, month: req.query.month })
  if (!parsed.success) {
    res.status(400).json({ error: 'Mes inválido' })
    return
  }

  const mine = await membershipOf(groupId, req.userId!)
  if (!mine) {
    res.status(404).json({ error: 'Ese grupo no existe o no sos miembro' })
    return
  }

  const targetId = parsed.data.userId ?? req.userId!
  const target = await membershipOf(groupId, targetId)
  if (!target) {
    res.status(404).json({ error: 'Esa persona no es miembro del grupo' })
    return
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { baseGoal: true } })
  const goal = target.personalGoal ?? group!.baseGoal

  const today = todayFor(req)
  const [year, month] = parsed.data.month.split('-').map(Number)
  const firstOfMonth = `${parsed.data.month}-01`
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate()
  const lastOfMonth = `${parsed.data.month}-${String(daysInMonth).padStart(2, '0')}`

  // La grilla arranca el lunes de la semana del día 1 y termina el domingo de
  // la semana del último día.
  const gridStart = weekStart(firstOfMonth)
  const gridEnd = shiftDay(weekStart(lastOfMonth), 6)

  const checkIns = await prisma.checkIn.findMany({
    where: { userId: targetId, day: { gte: gridStart, lte: gridEnd } },
    select: { id: true, day: true, note: true, photoUrl: true },
    orderBy: { day: 'asc' },
  })

  const mondays: string[] = []
  for (let cursor = gridStart; cursor <= gridEnd; cursor = shiftDay(cursor, 7)) mondays.push(cursor)

  res.json({
    month: parsed.data.month,
    userId: targetId,
    goal,
    usesPersonalGoal: target.personalGoal !== null,
    gridStart,
    gridEnd,
    checkIns,
    weeks: summarizeWeeks(new Set(checkIns.map((checkIn) => checkIn.day)), mondays, goal, today),
  })
})

/* ---------------------------------------------------------------------------
   Check-ins — la acción más importante de la app
   ------------------------------------------------------------------------- */

/** El día lo manda el cliente: lo que importa es su día local, no el del server. */
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD')

const checkInSchema = z.object({
  day: DAY,
  note: z.string().trim().max(280).optional(),
  photoUrl: z.string().url().optional(),
  photoPublicId: z.string().max(200).optional(),
})

/**
 * Firma para que el navegador suba la foto directo a Cloudinary.
 * Se pide solo si el usuario eligió una foto: un check-in sin foto no toca
 * este endpoint y por lo tanto no paga ninguna latencia extra.
 */
app.post('/api/uploads/checkin-signature', requireAuth, (req, res) => {
  if (!storageConfigured) {
    res.status(503).json({ error: 'Las fotos no están configuradas en este servidor' })
    return
  }
  const parsed = z.object({ day: DAY }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Día inválido' })
    return
  }
  res.json(createUploadSignature(req.userId!, parsed.data.day))
})

app.post('/api/checkins', requireAuth, async (req, res) => {
  const parsed = checkInSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Check-in inválido' })
    return
  }
  const { day, note, photoUrl, photoPublicId } = parsed.data

  // La URL viene del cliente, así que confirmamos que sea de nuestra cuenta y
  // carpeta de Cloudinary antes de guardarla.
  if (photoUrl && !isOwnCloudinaryUrl(photoUrl)) {
    res.status(400).json({ error: 'Esa foto no es válida' })
    return
  }

  // Uno por día. Si ya entrenó hoy no pisamos nada: devolvemos el que existe
  // para que la pantalla muestre "ya entrenaste hoy" en vez de duplicar.
  const existing = await prisma.checkIn.findUnique({
    where: { userId_day: { userId: req.userId!, day } },
  })
  if (existing) {
    res.status(409).json({ error: 'Ya marcaste el entrenamiento de hoy', checkIn: existing })
    return
  }

  const checkIn = await prisma.checkIn.create({
    data: { userId: req.userId!, day, note, photoUrl, photoPublicId },
  })
  res.status(201).json(checkIn)
})

/**
 * Último check-in de un usuario. Se va a reusar en varias pantallas (home,
 * lista de amigos, perfil), así que resuelve con una sola consulta apoyada en
 * el índice único (userId, day): filtra por userId y toma el primero por día
 * descendente, sin recorrer la tabla.
 *
 * Sin `userId` devuelve el propio; con `userId` solo se permite mirar el de un
 * amigo aceptado.
 */
app.get('/api/checkins/latest', requireAuth, async (req, res) => {
  const requested = req.query.userId ? String(req.query.userId) : req.userId!

  if (requested !== req.userId) {
    const link = await prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: req.userId, addresseeId: requested },
          { requesterId: requested, addresseeId: req.userId },
        ],
      },
      select: { id: true },
    })
    if (!link) {
      res.status(403).json({ error: 'Solo podés ver los check-ins de tus amigos' })
      return
    }
  }

  const checkIn = await prisma.checkIn.findFirst({
    where: { userId: requested },
    orderBy: { day: 'desc' },
  })
  res.json({ checkIn })
})

app.get('/api/checkins', requireAuth, async (req, res) => {
  const checkIns = await prisma.checkIn.findMany({
    where: { userId: req.userId },
    orderBy: { day: 'desc' },
    take: 60,
  })
  res.json(checkIns)
})


/* ---------------------------------------------------------------------------
   Detalle de un check-in y comentarios
   ------------------------------------------------------------------------- */

const COMMENT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  user: { select: FRIEND_SELECT },
} as const

/** Detalle con comentarios: es lo que abre el modal del calendario. */
app.get('/api/checkins/:id', requireAuth, async (req, res) => {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: String(req.params.id) },
    include: { user: { select: FRIEND_SELECT }, comments: { select: COMMENT_SELECT, orderBy: { createdAt: 'asc' } } },
  })
  if (!checkIn || !(await sharesGroup(req.userId!, checkIn.userId))) {
    res.status(404).json({ error: 'Ese entrenamiento no existe o no lo podés ver' })
    return
  }
  res.json(checkIn)
})

/** Comentar el check-in de alguien con quien compartís un grupo. */
app.post('/api/checkins/:id/comments', requireAuth, async (req, res) => {
  const parsed = z.object({ body: z.string().trim().min(1).max(280) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'El comentario no puede estar vacío' })
    return
  }

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, userId: true },
  })
  if (!checkIn || !(await sharesGroup(req.userId!, checkIn.userId))) {
    res.status(404).json({ error: 'Ese entrenamiento no existe o no lo podés comentar' })
    return
  }

  const comment = await prisma.comment.create({
    data: { checkInId: checkIn.id, userId: req.userId!, body: parsed.data.body },
    select: COMMENT_SELECT,
  })
  res.status(201).json(comment)
})

/* ------------------------------------------------------------------------- */

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] error no manejado:', err)
  res.status(500).json({ error: 'Error interno' })
})

app.listen(PORT, () => {
  console.log(`[api] Top Training escuchando en http://localhost:${PORT}`)
  console.log(`[api] proveedores sociales activos: ${enabledProviders.join(', ') || 'ninguno (solo email)'}`)
})
