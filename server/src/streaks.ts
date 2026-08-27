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

function consecutiveDailyStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : days.has(shiftDay(today, -1)) ? shiftDay(today, -1) : null
  if (!cursor) return 0

  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

function weekMetGoal(days: Set<string>, monday: string, goal: number): boolean {
  return weekDays(monday).filter((day) => days.has(day)).length >= goal
}

/**
 * Racha diaria: entrenos seguidos, sin cortar por un día de descanso si esa
 * semana cumplió (o todavía puede cumplir) la meta personal.
 *
 * Si fallas el miércoles pero igual llegas a 4/4, esos 4 días siguen contando.
 * Se rompe solo cuando una semana ya terminada no llegó a la meta.
 *
 * Sin meta, vuelve a ser días corridos con check-in. Si todavía no marcó hoy,
 * la racha NO está rota: perderla a las 9 de la mañana sería una crueldad.
 */
export function dailyStreak(days: Set<string>, goal: number, today: string): number {
  if (days.size === 0) return 0
  if (!goal || goal < 1) return consecutiveDailyStreak(days, today)

  const thisWeek = weekStart(today)
  const earliest = [...days].reduce((min, day) => (day < min ? day : min))

  let streak = 0
  for (let cursor = today; cursor >= earliest; cursor = shiftDay(cursor, -1)) {
    const monday = weekStart(cursor)
    if (monday < thisWeek && !weekMetGoal(days, monday, goal)) break
    if (days.has(cursor)) streak++
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
  /** Entrenos de la racha actual: no se corta por un descanso si la semana cumplió la meta. */
  daily: number
  /** Semanas consecutivas cumpliendo la meta. */
  weekly: number
  /** Meta semanal usada para calcular `weekly` y para no romper `daily`. */
  goal: number
}

export function computeStreaks(dayList: string[], goal: number, today: string): Streaks {
  const days = new Set(dayList)
  return { daily: dailyStreak(days, goal, today), weekly: weeklyStreak(days, goal, today), goal }
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
 * A diferencia de `dailyStreak`, que mira hacia atrás desde hoy y perdona
 * los descansos de una semana cumplida, esta recorre la ventana y cuenta
 * días corridos: es lo que sirve para el recap ("la racha más larga del mes").
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
