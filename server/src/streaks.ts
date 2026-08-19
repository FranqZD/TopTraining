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

/**
 * Racha más larga dentro de un rango cerrado de días.
 *
 * A diferencia de `dailyStreak`, que mira hacia atrás desde hoy, esta recorre
 * la ventana entera y devuelve el mejor tramo: es lo que sirve para el recap
 * ("la racha más larga del mes"), donde el mes ya pasó y no hay un "hoy".
 */
export function longestStreak(days: Set<string>, from: string, to: string): number {
  let best = 0
  let run = 0
  for (let day = from; day <= to; day = shiftDay(day, 1)) {
    run = days.has(day) ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

/** Último día del mes "YYYY-MM", como "YYYY-MM-DD". */
export function monthEnd(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

/**
 * Los lunes que "pertenecen" a un mes: los que caen dentro de él.
 *
 * Una semana pertenece a un solo mes, el de su lunes. Si contáramos todas las
 * semanas que tocan el mes, la semana partida entre dos meses se contaría dos
 * veces y ninguna de las dos con todos sus días.
 */
export function monthWeeks(month: string): string[] {
  const first = `${month}-01`
  const last = monthEnd(month)
  const firstMonday = weekStart(first) >= first ? weekStart(first) : shiftDay(weekStart(first), 7)

  const mondays: string[] = []
  for (let monday = firstMonday; monday <= last; monday = shiftDay(monday, 7)) mondays.push(monday)
  return mondays
}

/** Mes anterior a "YYYY-MM". */
export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year!, monthNumber! - 2, 1)).toISOString().slice(0, 7)
}
