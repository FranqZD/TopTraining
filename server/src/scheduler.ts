import { prisma } from './db.js'
import { pushConfigured, sendToUser } from './push.js'
import { generateClosedRecaps } from './recap.js'

/**
 * Job que recuerda entrenar.
 *
 * Corre cada pocos minutos y busca usuarios que ya pasaron su ventana de
 * entreno y todavía no marcaron. El "una vez por día" no lo garantiza este
 * código sino el índice único de PushLog (userId, day, kind): aunque el job
 * corra dos veces o haya dos procesos, la segunda inserción falla y no se
 * manda nada.
 */

/**
 * A qué hora local avisamos, según el horario que eligió el usuario.
 *
 * El pedido daba rangos para tarde y noche; elegí el borde que deja margen
 * para reaccionar y no el que ya es tarde:
 *  - Mañana 10:00 — la mañana ya se fue, pero queda todo el día.
 *  - Tarde 17:00 — salida del laburo, con el gimnasio todavía abierto.
 *  - Noche 20:30 — dentro del rango 20–21, y todavía se llega a ir.
 */
const NUDGE_TIME: Record<string, { hour: number; minute: number }> = {
  morning: { hour: 10, minute: 0 },
  afternoon: { hour: 17, minute: 0 },
  night: { hour: 20, minute: 30 },
}

/** Después de esta hora local ya no molestamos: el día está perdido. */
const CUTOFF_HOUR = 23

const KIND = 'nudge'

interface LocalNow {
  day: string
  minutes: number
}

/**
 * Qué día y qué hora es PARA EL USUARIO. El servidor puede estar en otro
 * continente, así que todo se calcula en su zona horaria.
 */
export function localNow(timeZone: string, at = new Date()): LocalNow | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at)

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    const hour = Number(get('hour')) % 24 // en-CA puede devolver "24" a medianoche

    return {
      day: `${get('year')}-${get('month')}-${get('day')}`,
      minutes: hour * 60 + Number(get('minute')),
    }
  } catch {
    // Zona horaria inválida (dato viejo o manipulado): no es motivo para
    // romper el job entero.
    return null
  }
}

/** ¿Está dentro de la ventana para avisarle? */
export function shouldNudge(slot: string, now: LocalNow): boolean {
  const time = NUDGE_TIME[slot]
  if (!time) return false
  const target = time.hour * 60 + time.minute
  return now.minutes >= target && now.minutes < CUTOFF_HOUR * 60
}

export const NUDGE_COPY = [
  { title: 'Todavía estás a tiempo', body: 'No has marcado nada hoy. Todavía llegas.' },
  { title: 'Oye, ¿y el entreno?', body: 'Tus amigos lo van a ver. Todavía estás a tiempo.' },
  { title: 'Falta lo tuyo', body: 'Todavía estás a tiempo de entrenar hoy.' },
]

/**
 * Una pasada del job. Exportada aparte para poder ejecutarla a mano y
 * probarla sin esperar al intervalo.
 */
export async function runNudgeSweep(at = new Date()): Promise<{ checked: number; sent: number }> {
  if (!pushConfigured) return { checked: 0, sent: 0 }

  // Solo gente que eligió horario, quiere el recordatorio y tiene al menos un
  // dispositivo. Filtrar acá evita reservar el envío del día para alguien que
  // lo tiene apagado.
  const candidates = await prisma.user.findMany({
    where: {
      trainingSlot: { not: null },
      onboardingCompleted: true,
      notifyNudge: true,
      pushSubscriptions: { some: {} },
    },
    select: { id: true, name: true, trainingSlot: true, timeZone: true },
  })

  let sent = 0

  for (const user of candidates) {
    const now = localNow(user.timeZone ?? 'UTC', at)
    if (!now || !shouldNudge(user.trainingSlot!, now)) continue

    const alreadyTrained = await prisma.checkIn.findUnique({
      where: { userId_day: { userId: user.id, day: now.day } },
      select: { id: true },
    })
    if (alreadyTrained) continue

    // Reservamos el envío ANTES de mandarlo. Si la fila ya existe, alguien
    // (otra corrida, otro proceso) ya avisó hoy y acá no pasa nada.
    try {
      await prisma.pushLog.create({ data: { userId: user.id, day: now.day, kind: KIND } })
    } catch {
      continue
    }

    const copy = NUDGE_COPY[Math.floor(Math.random() * NUDGE_COPY.length)]!
    const delivered = await sendToUser(user.id, { ...copy, url: '/checkin', tag: 'nudge' }, 'nudge')

    if (delivered > 0) {
      sent++
    } else {
      // No llegó a ningún dispositivo: soltamos la reserva para reintentar
      // en la próxima pasada en vez de dar el día por avisado.
      await prisma.pushLog
        .delete({ where: { userId_day_kind: { userId: user.id, day: now.day, kind: KIND } } })
        .catch(() => {})
    }
  }

  return { checked: candidates.length, sent }
}

/**
 * Arranca los trabajos programados. El intervalo se configura con
 * PUSH_SWEEP_MINUTES y sirve para los dos:
 *
 *  - Recordatorios de entreno (solo si hay claves VAPID).
 *  - Recap mensual: en teoría es "el día 1", pero en vez de atarlo a esa hora
 *    exacta se pregunta en cada pasada si falta el recap del mes cerrado. Sale
 *    igual el día 1, y si el servidor estuvo caído se genera al volver en vez
 *    de perderse el mes.
 */
export function startScheduler(): void {
  const minutes = Math.max(1, Number(process.env.PUSH_SWEEP_MINUTES ?? 10))

  if (pushConfigured) console.log(`[jobs] recordatorios activos, revisando cada ${minutes} min`)
  else console.log('[jobs] sin claves VAPID: el job de recordatorios queda apagado')

  const tick = async () => {
    try {
      const { checked, sent } = await runNudgeSweep()
      if (sent > 0) console.log(`[jobs] ${sent} recordatorio(s) enviados de ${checked} candidatos`)
    } catch (error) {
      console.error('[jobs] el job de recordatorios falló:', error)
    }

    try {
      const { generated } = await generateClosedRecaps(new Date().toISOString().slice(0, 10))
      if (generated > 0) console.log(`[jobs] ${generated} recap(s) mensuales generados`)
    } catch (error) {
      console.error('[jobs] el job de recaps falló:', error)
    }
  }

  void tick()
  setInterval(() => void tick(), minutes * 60_000).unref()
}
