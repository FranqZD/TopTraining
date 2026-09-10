import { shiftDay, weekDays, weekStart, weeklyStreak } from './streaks.js'

/**
 * Mascota de Inicio. No se guarda: se calcula con los check-ins y la meta
 * semanal, igual que las rachas.
 *
 * Evolución: cada semana cumplida sube un nivel (hasta 5). Cada semana
 * terminada sin la meta baja uno, no vuelve a 0.
 *
 * Ánimo:
 *  - `ok`     — ya marcaste hoy.
 *  - `skip1`  — todavía no marcas hoy.
 *  - `broken` — la semana pasada se cerró sin llegar a la meta. Gana hasta
 *               que cierres una semana de nuevo. El cuerpo es el nivel
 *               al que bajó, triste.
 */

export type PetStage = 0 | 1 | 2 | 3 | 4 | 5
export type PetMood = 'ok' | 'skip1' | 'skip2' | 'broken'

export interface PetView {
  stage: PetStage
  mood: PetMood
  /** Semanas en las que sí llegaste a la meta (todas, no solo la racha). */
  weeksMet: number
  /** Días corridos sin marcar, mirando hacia atrás desde ayer. Hoy no cuenta. */
  skipDays: number
  goal: number
}

function weekMet(days: Set<string>, monday: string, goal: number): boolean {
  return goal > 0 && weekDays(monday).filter((day) => days.has(day)).length >= goal
}

function countWeeksMet(days: Set<string>, goal: number, today: string): number {
  if (!goal || days.size === 0) return 0
  const earliest = [...days].reduce((min, day) => (day < min ? day : min))
  const thisWeek = weekStart(today)
  let count = 0
  for (let monday = weekStart(earliest); monday <= thisWeek; monday = shiftDay(monday, 7)) {
    if (weekMet(days, monday, goal)) count++
  }
  return count
}

/** Días vacíos seguidos, desde ayer. Hoy no: todavía puedes marcar. */
function countSkipDays(days: Set<string>, today: string): number {
  let count = 0
  for (let cursor = shiftDay(today, -1); count < 14; cursor = shiftDay(cursor, -1)) {
    if (days.has(cursor)) break
    count++
  }
  return count
}

/**
 * La racha semanal está en 0 y la semana pasada existió (ya entrenabas) y
 * no llegó a la meta. Un usuario nuevo esta semana no arranca fallecido.
 */
function isBroken(days: Set<string>, goal: number, today: string): boolean {
  if (!goal || goal < 1) return false
  if (weeklyStreak(days, goal, today) > 0) return false
  const lastMonday = shiftDay(weekStart(today), -7)
  const lastSunday = shiftDay(lastMonday, 6)
  const started = [...days].some((day) => day <= lastSunday)
  if (!started) return false
  return !weekMet(days, lastMonday, goal)
}

/**
 * Nivel 0–5 recorriendo las semanas desde el primer entreno.
 * Cumplir sube uno; fallar una semana ya cerrada baja uno.
 * La semana en curso solo suma si ya llegó a la meta.
 */
function petStage(days: Set<string>, goal: number, today: string): PetStage {
  if (!goal || goal < 1 || days.size === 0) return 0

  const earliest = [...days].reduce((min, day) => (day < min ? day : min))
  const thisWeek = weekStart(today)
  let level = 0
  for (let monday = weekStart(earliest); monday < thisWeek; monday = shiftDay(monday, 7)) {
    level = weekMet(days, monday, goal) ? Math.min(5, level + 1) : Math.max(0, level - 1)
  }
  if (weekMet(days, thisWeek, goal)) level = Math.min(5, level + 1)
  return level as PetStage
}

export function computePet(dayList: string[], goal: number, today: string): PetView {
  const days = new Set(dayList)
  const weeksMet = countWeeksMet(days, goal, today)
  const stage = petStage(days, goal, today)
  const skipDays = days.size === 0 ? 0 : countSkipDays(days, today)

  let mood: PetMood = days.has(today) ? 'ok' : 'skip1'
  if (isBroken(days, goal, today)) mood = 'broken'

  return { stage, mood, weeksMet, skipDays, goal }
}
