/**
 * Rachas — lógica derivada. No se guardan en ninguna tabla: se calculan a
 * partir de los check-ins, así nunca quedan desincronizadas de la realidad.
 *
 * Todo trabaja con días en formato "YYYY-MM-DD" (el día LOCAL del usuario,
 * que es el que él mandó al marcar). Nada de Date con zonas horarias: comparar
 * strings de fecha es exacto y no se rompe con el horario de verano.
 */

const DAY_MS = 86_400_000

function toUTC(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year!, month! - 1, date!)
}

function toDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function shiftDay(day: string, days: number): string {
  return toDay(toUTC(day) + days * DAY_MS)
}

/** Lunes de la semana a la que pertenece ese día. La semana va lunes→domingo. */
export function weekStart(day: string): string {
  const timestamp = toUTC(day)
  // getUTCDay: 0 = domingo. Lo pasamos a 0 = lunes.
  const weekday = (new Date(timestamp).getUTCDay() + 6) % 7
  return toDay(timestamp - weekday * DAY_MS)
}

/** Todos los días de esa semana, de lunes a domingo. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDay(monday, index))
}

/**
 * Racha diaria: días consecutivos con check-in.
 *
 * Si todavía no marcó hoy la racha NO está rota — arranca a contar desde ayer.
 * Perder la racha por no haber entrenado todavía a las 9 de la mañana sería
 * una crueldad innecesaria.
 */
export function dailyStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : days.has(shiftDay(today, -1)) ? shiftDay(today, -1) : null
  if (!cursor) return 0

  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

/**
 * Racha semanal: semanas consecutivas cumpliendo la meta (lunes a domingo).
 *
 * La semana en curso solo cuenta si YA cumplió; si todavía no llegó a la meta
 * no rompe nada, porque la semana no terminó. Se empieza a contar desde la
 * semana pasada.
 */
export function weeklyStreak(days: Set<string>, goal: number, today: string): number {
  if (!goal || goal < 1) return 0

  const metGoal = (monday: string) => weekDays(monday).filter((day) => days.has(day)).length >= goal

  const thisWeek = weekStart(today)
  let cursor = metGoal(thisWeek) ? thisWeek : shiftDay(thisWeek, -7)

  let streak = 0
  while (metGoal(cursor)) {
    streak++
    cursor = shiftDay(cursor, -7)
  }
  return streak
}

export interface Streaks {
  /** Días consecutivos con check-in. */
  daily: number
  /** Semanas consecutivas cumpliendo la meta. */
  weekly: number
  /** Meta semanal usada para calcular `weekly`. */
  goal: number
}

export function computeStreaks(dayList: string[], goal: number, today: string): Streaks {
  const days = new Set(dayList)
  return { daily: dailyStreak(days, today), weekly: weeklyStreak(days, goal, today), goal }
}

/**
 * Estado de cada semana del calendario.
 *
 * `current` y `future` existen para no clavarle una equis a una semana que
 * todavía no terminó: hasta el domingo, no llegar a la meta no es un fracaso,
 * es que la semana sigue corriendo.
 */
export type WeekStatus = 'met' | 'missed' | 'current' | 'future'

export interface WeekSummary {
  /** Lunes de la semana. */
  start: string
  count: number
  goal: number
  met: boolean
  status: WeekStatus
}

export function summarizeWeeks(
  days: Set<string>,
  mondays: string[],
  goal: number,
  today: string,
): WeekSummary[] {
  const currentWeek = weekStart(today)

  return mondays.map((start) => {
    const count = weekDays(start).filter((day) => days.has(day)).length
    const met = goal > 0 && count >= goal

    const status: WeekStatus = met
      ? 'met'
      : start > currentWeek
        ? 'future'
        : start === currentWeek
          ? 'current'
          : 'missed'

    return { start, count, goal, met, status }
  })
}
