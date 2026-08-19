import { prisma } from './db.js'
import { longestStreak, monthEnd, monthWeeks, summarizeWeeks, weekDays } from './streaks.js'

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

export interface RecapMember {
  id: string
  name: string
  image: string | null
  /** Meta semanal de esa persona en este grupo (personal o la del grupo). */
  goal: number
  checkIns: number
  weeksEvaluated: number
  weeksMet: number
  /** Racha diaria más larga dentro del mes. */
  longestStreak: number
  /** weeksMet / weeksEvaluated, 0..1. null si no hubo semanas que evaluar. */
  completion: number | null
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
  members: RecapMember[]
  /** El que mejor la remó. null si no hay nada que destacar todavía. */
  best: RecapMember | null
  /** El más huevón. null si son pocos o si nadie quedó mal parado. */
  worst: RecapMember | null
  /** true si TODOS cumplieron todas las semanas: nadie merece la burla. */
  everyoneDelivered: boolean
  generatedAt: string
}

/**
 * Calcula el recap desde los check-ins. Es una función pura respecto de la
 * base: se puede llamar para un mes cerrado (job del día 1) o para el mes en
 * curso (consulta bajo demanda), y la única diferencia es `partial`.
 */
export async function computeRecap(groupId: string, month: string, today: string): Promise<Recap | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } },
  })
  if (!group) return null

  const from = `${month}-01`
  const to = monthEnd(month)
  const partial = today <= to

  const mondays = monthWeeks(month)

  const checkIns = await prisma.checkIn.findMany({
    where: {
      userId: { in: group.members.map((member) => member.userId) },
      // Traemos también los días de las semanas del mes que se van al mes
      // siguiente, si no la última semana quedaría cortada.
      day: { gte: from, lte: mondays.length ? maxDay(to, lastDayOfWeeks(mondays)) : to },
    },
    select: { userId: true, day: true },
  })

  const daysByUser = new Map<string, Set<string>>()
  for (const checkIn of checkIns) {
    const set = daysByUser.get(checkIn.userId) ?? new Set<string>()
    set.add(checkIn.day)
    daysByUser.set(checkIn.userId, set)
  }

  const members: RecapMember[] = group.members.map((member) => {
    const days = daysByUser.get(member.userId) ?? new Set<string>()
    const goal = member.personalGoal ?? group.baseGoal

    // Solo las semanas ya terminadas: la que está corriendo todavía puede
    // cumplirse y las futuras no existen.
    const weeks = summarizeWeeks(days, mondays, goal, today).filter(
      (week) => week.status === 'met' || week.status === 'missed',
    )

    return {
      id: member.userId,
      name: member.user.name,
      image: member.user.image,
      goal,
      // Los entrenos que se cuentan sí son los del mes calendario.
      checkIns: [...days].filter((day) => day >= from && day <= to).length,
      weeksEvaluated: weeks.length,
      weeksMet: weeks.filter((week) => week.met).length,
      longestStreak: longestStreak(days, from, to),
      completion: weeks.length ? weeks.filter((week) => week.met).length / weeks.length : null,
    }
  })

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

  // Y solo hay "huevón" si de verdad quedó atrás de alguien. Con un solo
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
    members: ranked,
    best,
    worst,
    everyoneDelivered,
    generatedAt: new Date().toISOString(),
  }
}

function lastDayOfWeeks(mondays: string[]): string {
  return weekDays(mondays[mondays.length - 1]!)[6]!
}

function maxDay(a: string, b: string): string {
  return a > b ? a : b
}

/**
 * Devuelve el recap guardado o lo calcula.
 *
 * - Mes en curso: siempre se calcula al vuelo (parcial) y no se guarda; si lo
 *   guardáramos quedaría una foto vieja pegada al mes que todavía cambia.
 * - Mes cerrado: se usa el guardado. Si no existe (el job no corrió, el
 *   servidor estaba caído el día 1) se calcula y se guarda ahí mismo.
 */
export async function getRecap(groupId: string, month: string, today: string): Promise<Recap | null> {
  const closed = month < today.slice(0, 7)

  if (closed) {
    const stored = await prisma.groupRecap.findUnique({ where: { groupId_month: { groupId, month } } })
    if (stored) return JSON.parse(stored.data) as Recap
  }

  const recap = await computeRecap(groupId, month, today)
  if (recap && closed) await storeRecap(groupId, month, recap)
  return recap
}

async function storeRecap(groupId: string, month: string, recap: Recap): Promise<void> {
  await prisma.groupRecap
    .upsert({
      where: { groupId_month: { groupId, month } },
      create: { groupId, month, data: JSON.stringify(recap) },
      update: {},
    })
    .catch(() => {})
}

/**
 * Job del día 1: congela el recap del mes que terminó para todos los grupos.
 *
 * Es idempotente por el índice único (groupId, month), así que correrlo de más
 * no duplica nada. Y como se ejecuta en cada pasada del scheduler, si el
 * servidor estuvo caído el día 1 el recap se genera igual apenas vuelve.
 */
export async function generateClosedRecaps(today: string): Promise<{ generated: number }> {
  const month = previousMonthOf(today)
  const groups = await prisma.group.findMany({
    where: { recaps: { none: { month } }, createdAt: { lt: new Date(`${today.slice(0, 7)}-01T00:00:00Z`) } },
    select: { id: true },
  })

  let generated = 0
  for (const group of groups) {
    const recap = await computeRecap(group.id, month, today)
    if (!recap) continue
    await storeRecap(group.id, month, recap)
    generated++
  }
  return { generated }
}

function previousMonthOf(today: string): string {
  const [year, month] = today.slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 2, 1)).toISOString().slice(0, 7)
}
