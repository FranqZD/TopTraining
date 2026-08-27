import { shiftDay, weekDays, weekStart, weeklyStreak } from './streaks.js'

/**
 * Mascota de Inicio. No se guarda: se calcula con los check-ins y la meta
 * semanal, igual que las rachas.
 *
 * Evolución: semanas consecutivas cumpliendo la meta, de 0 a 5. Si fallas
 * una, el nivel vuelve a 1.
 *
 * Ánimo:
 *  - `ok`     — ya marcaste hoy.
 *  - `skip1`  — todavía no marcas hoy.
 *  - `broken` — la semana pasada se cerró sin llegar a la meta. Gana hasta
 *               que cierres una semana de nuevo. El cuerpo es el de nivel 1.
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

export function computePet(dayList: string[], goal: number, today: string): PetView {
  const days = new Set(dayList)
  const weeksMet = countWeeksMet(days, goal, today)
  const streak = weeklyStreak(days, goal, today)
  const stage = Math.min(5, streak) as PetStage
  const skipDays = days.size === 0 ? 0 : countSkipDays(days, today)

  let mood: PetMood = days.has(today) ? 'ok' : 'skip1'
  if (isBroken(days, goal, today)) mood = 'broken'

  return { stage, mood, weeksMet, skipDays, goal }
}
