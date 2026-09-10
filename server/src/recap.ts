import { prisma } from './db.js'
import {
  longestStreak,
  monthEnd,
  monthWeeks,
  monthWeekSpan,
  monthWeeksClosed,
  shiftDay,
  summarizeWeeks,
  weekDays,
  weeklyStreak,
} from './streaks.js'

/**
 * Recap mensual de un grupo.
 *
 * Lo que se mide es el cumplimiento de la META SEMANAL de cada uno, no la
 * cantidad bruta de entrenos: si dos personas tienen metas distintas (una 3×,
 * otra 5×), compararlas por entrenos sería injusto. La unidad de todo el
 * recap es la "semana-persona": cada miembro × cada semana del mes.
 *
 * Solo se evalúan las semanas TERMINADAS. La semana en curso no entra, igual
 * que en las rachas: todavía puede cumplirse.
 */

/** Un título por persona. Si califica para varios, gana el de más peso. */
export type RecapTitle = 'rey' | 'enrachado' | 'huevon' | 'pollito'

export interface RecapMember {
  id: string
  name: string
  image: string | null
  /** Meta semanal de esa persona en este grupo (personal o la del grupo). */
  goal: number
  /** Entrenos de las semanas que pertenecen al mes (lunes a domingo). */
  checkIns: number
  weeksEvaluated: number
  weeksMet: number
  /** Racha diaria más larga dentro del mes. */
  longestStreak: number
  /** weeksMet / weeksEvaluated, 0..1. null si no hubo semanas que evaluar. */
  completion: number | null
  /** Apodo del mes. null si no hay nada que decir. */
  title: RecapTitle | null
  /**
   * Entrenos de cada semana del mes, en orden. Misma cuenta que `checkIns`:
   * la semana entera (lunes a domingo), aunque se le escapen días al mes
   * calendario. Las primeras `weeksEvaluated` ya terminaron.
   */
  weeklyCheckIns: number[]
  /** Auras recibidas en los entrenos de este mes. */
  likes: number
  /** Lauras recibidas en los entrenos de este mes. */
  lauras: number
}

export interface Recap {
  groupId: string
  groupName: string
  month: string
  /** true si el mes todavía está corriendo: el recap es provisorio. */
  partial: boolean
  /** Semanas del mes que ya terminaron y por lo tanto cuentan. */
  weeksEvaluated: number
  /** Cumplimiento del grupo: semanas-persona cumplidas sobre evaluadas. */
  completion: number | null
  totalCheckIns: number
  /** Techo del mes: la meta de cada uno por cada semana ya terminada. */
  possibleCheckIns: number
  members: RecapMember[]
  /** El que mejor la remó. null si no hay nada que destacar todavía. */
  best: RecapMember | null
  /** El más flojo. null si son pocos o si nadie quedó mal parado. */
  worst: RecapMember | null
  /** true si TODOS cumplieron todas las semanas: nadie merece la burla. */
  everyoneDelivered: boolean
  generatedAt: string
}

/**
 * Calcula el recap desde los check-ins. Es una función pura respecto de la
 * base: se puede llamar para un mes cerrado o para el mes en curso
 * (consulta bajo demanda), y la única diferencia es `partial`.
 */
export async function computeRecap(groupId: string, month: string, today: string): Promise<Recap | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } },
  })
  if (!group) return null

  const from = `${month}-01`
  const mondays = monthWeeks(month)
  const span = monthWeekSpan(month) ?? { start: from, end: monthEnd(month) }
  const partial = !monthWeeksClosed(month, today)
  /** Rachas vivas se miran al cierre de la última semana, no al día de hoy si ya pasó. */
  const asOf = today <= span.end ? today : span.end

  const memberIds = group.members.map((member) => member.userId)
  const lookback = shiftDay(from, -63)

  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId: { in: memberIds },
      // Traemos también los días de las semanas del mes que se van al mes
      // siguiente, y un par de meses atrás para las rachas que cruzan el corte.
      day: { gte: lookback, lte: span.end },
    },
    select: { id: true, userId: true, day: true },
  })

  const daysByUser = new Map<string, Set<string>>()
  for (const checkIn of checkIns) {
    const set = daysByUser.get(checkIn.userId) ?? new Set<string>()
    set.add(checkIn.day)
    daysByUser.set(checkIn.userId, set)
  }

  const monthCheckIns = checkIns.filter((row) => row.day >= span.start && row.day <= span.end)
  const votesByUser = await votesReceivedByUser(monthCheckIns)

  const drafted = group.members.map((member) => {
    const days = daysByUser.get(member.userId) ?? new Set<string>()
    const goal = member.personalGoal ?? group.baseGoal
    const votes = votesByUser.get(member.userId) ?? { likes: 0, lauras: 0 }

    const summaries = summarizeWeeks(days, mondays, goal, today)
    // Solo las semanas ya terminadas: la que está corriendo todavía puede
    // cumplirse y las futuras no existen.
    const weeks = summaries.filter((week) => week.status === 'met' || week.status === 'missed')

    return {
      weeklyCheckIns: summaries.map((week) => week.count),
      id: member.userId,
      name: member.user.name,
      image: member.user.image,
      goal,
      // Misma cuenta que las barras: entrenos de las semanas del mes, no del
      // mes calendario. Un día partido no se queda fuera ni se cuenta dos veces.
      checkIns: [...days].filter((day) => day >= span.start && day <= span.end).length,
      weeksEvaluated: weeks.length,
      weeksMet: weeks.filter((week) => week.met).length,
      longestStreak: longestStreak(days, span.start, span.end),
      completion: weeks.length ? weeks.filter((week) => week.met).length / weeks.length : null,
      joinedAt: member.joinedAt.getTime(),
      weekly: weeklyStreak(days, goal, asOf),
      likes: votes.likes,
      lauras: votes.lauras,
    }
  })

  const members: RecapMember[] = assignTitles(drafted)

  const weeksEvaluated = members.reduce((total, member) => total + member.weeksEvaluated, 0)
  const weeksMet = members.reduce((total, member) => total + member.weeksMet, 0)

  const ranked = [...members].sort(
    (a, b) =>
      b.weeksMet - a.weeksMet ||
      b.longestStreak - a.longestStreak ||
      b.checkIns - a.checkIns ||
      a.name.localeCompare(b.name),
  )

  const everyoneDelivered =
    weeksEvaluated > 0 && members.every((member) => member.weeksMet === member.weeksEvaluated)

  const top = ranked[0]
  const bottom = ranked[ranked.length - 1]

  // Si no entrenó nadie, no hay a quién destacar: coronar al primero por orden
  // alfabético sería premiar la nada.
  const best = weeksEvaluated > 0 && top && top.checkIns > 0 ? top : null

  // Y solo hay "flojo" si de verdad quedó atrás de alguien. Con un solo
  // miembro, con todos iguales o con todos cumpliendo, no se carga a nadie.
  const differentiated =
    Boolean(top && bottom) && (top!.weeksMet > bottom!.weeksMet || top!.checkIns > bottom!.checkIns)
  const worst = best && ranked.length > 1 && !everyoneDelivered && differentiated ? bottom! : null

  return {
    groupId,
    groupName: group.name,
    month,
    partial,
    weeksEvaluated: mondays.filter((monday) => weekDays(monday)[6]! < today).length,
    completion: weeksEvaluated ? weeksMet / weeksEvaluated : null,
    totalCheckIns: members.reduce((total, member) => total + member.checkIns, 0),
    possibleCheckIns: members.reduce((total, member) => total + member.goal * member.weeksEvaluated, 0),
    members: ranked,
    best,
    worst,
    everyoneDelivered,
    generatedAt: new Date().toISOString(),
  }
}

/** Auras y lauras por dueño del check-in. El voto propio no cuenta. */
async function votesReceivedByUser(
  monthCheckIns: { id: string; userId: string }[],
): Promise<Map<string, { likes: number; lauras: number }>> {
  const tally = new Map<string, { likes: number; lauras: number }>()
  if (monthCheckIns.length === 0) return tally

  const ownerOf = new Map(monthCheckIns.map((row) => [row.id, row.userId]))
  const votes = await prisma.vote.findMany({
    where: { checkInId: { in: monthCheckIns.map((row) => row.id) } },
    select: { checkInId: true, userId: true, kind: true },
  })

  for (const vote of votes) {
    const ownerId = ownerOf.get(vote.checkInId)
    if (!ownerId || ownerId === vote.userId) continue
    const current = tally.get(ownerId) ?? { likes: 0, lauras: 0 }
    if (vote.kind === 'like') current.likes += 1
    else if (vote.kind === 'laura') current.lauras += 1
    tally.set(ownerId, current)
  }

  return tally
}

type DraftMember = Omit<RecapMember, 'title'> & {
  joinedAt: number
  weekly: number
}

/**
 * Un título por cabeza, en este orden:
 *   REY        — más semanas cumplidas, racha y entrenos (puede haber empate)
 *   ENRACHADO  — dos semanas seguidas cumpliendo la meta
 *   POLLITO    — el más nuevo del grupo (solo si hay alguien más viejo)
 */
function assignTitles(drafted: DraftMember[]): RecapMember[] {
  const titleOf = new Map<string, RecapTitle>()
  const taken = new Set<string>()

  const claim = (id: string, title: RecapTitle) => {
    if (taken.has(id)) return
    titleOf.set(id, title)
    taken.add(id)
  }

  const active = drafted.filter((member) => member.checkIns > 0)
  if (active.length > 0) {
    const top = [...active].sort(
      (a, b) =>
        b.weeksMet - a.weeksMet || b.longestStreak - a.longestStreak || b.checkIns - a.checkIns,
    )[0]!
    for (const member of active) {
      if (
        member.weeksMet === top.weeksMet &&
        member.longestStreak === top.longestStreak &&
        member.checkIns === top.checkIns
      ) {
        claim(member.id, 'rey')
      }
    }
  }

  for (const member of drafted) {
    if (member.weekly >= 2) claim(member.id, 'enrachado')
  }

  const newest = Math.max(...drafted.map((member) => member.joinedAt))
  const hasOlder = drafted.some((member) => member.joinedAt < newest)
  if (hasOlder) {
    for (const member of drafted) {
      if (member.joinedAt === newest) claim(member.id, 'pollito')
    }
  }

  return drafted.map(({ joinedAt: _joinedAt, weekly: _weekly, ...member }) => ({
    ...member,
    title: titleOf.get(member.id) ?? null,
  }))
}

/**
 * Devuelve el recap guardado o lo calcula.
 *
 * - Mientras la última semana del mes no haya cerrado (el domingo todavía
 *   no pasó): se calcula al vuelo y no se guarda. Congelarlo el día 1 dejaría
 *   fuera los entrenos de esa semana que caen en el mes siguiente.
 * - Mes cerrado (ya pasó ese domingo): se usa el guardado. Si no existe o se
 *   congeló demasiado pronto, se calcula y se guarda ahí mismo.
 */
export async function getRecap(groupId: string, month: string, today: string): Promise<Recap | null> {
  const closed = monthWeeksClosed(month, today)
  const stored = closed
    ? await prisma.groupRecap.findUnique({ where: { groupId_month: { groupId, month } } })
    : null

  if (stored && snapshotCoversMonth(stored.generatedAt, month)) {
    return JSON.parse(stored.data) as Recap
  }

  const recap = await computeRecap(groupId, month, today)
  if (recap && closed) await storeRecap(groupId, month, recap, { overwrite: Boolean(stored) })
  return recap
}

async function storeRecap(
  groupId: string,
  month: string,
  recap: Recap,
  { overwrite = false }: { overwrite?: boolean } = {},
): Promise<void> {
  await prisma.groupRecap
    .upsert({
      where: { groupId_month: { groupId, month } },
      create: { groupId, month, data: JSON.stringify(recap) },
      update: overwrite ? { data: JSON.stringify(recap), generatedAt: new Date() } : {},
    })
    .catch(() => {})
}

/** Un snapshot es final si se escribió después de que cerró la última semana. */
function snapshotCoversMonth(generatedAt: Date, month: string): boolean {
  const span = monthWeekSpan(month)
  if (!span) return true
  return generatedAt.toISOString().slice(0, 10) > span.end
}

/**
 * Congela el recap del último mes cuyas semanas ya terminaron.
 *
 * No es el día 1 del mes calendario: si la última semana se pasa al mes
 * siguiente, espera a que cierre. Es idempotente por el índice único, y si
 * quedó un snapshot prematuro (de cuando se congelaba el día 1) lo pisa.
 */
export async function generateClosedRecaps(today: string): Promise<{ generated: number }> {
  const month = previousMonthOf(today)
  if (!monthWeeksClosed(month, today)) return { generated: 0 }

  const freezeFrom = shiftDay(monthWeekSpan(month)!.end, 1)
  const groups = await prisma.group.findMany({
    where: { createdAt: { lt: new Date(`${today.slice(0, 7)}-01T00:00:00Z`) } },
    select: { id: true, recaps: { where: { month }, select: { generatedAt: true } } },
  })
  const pending = groups.filter((group) => {
    const recap = group.recaps[0]
    return !recap || recap.generatedAt.toISOString().slice(0, 10) < freezeFrom
  })

  let generated = 0
  for (const group of pending) {
    const recap = await computeRecap(group.id, month, today)
    if (!recap) continue
    await storeRecap(group.id, month, recap, { overwrite: true })
    generated++
  }
  return { generated }
}

function previousMonthOf(today: string): string {
  const [year, month] = today.slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 2, 1)).toISOString().slice(0, 7)
}
