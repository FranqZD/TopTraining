import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Flame, Loader2, X } from 'lucide-react'
import { Card, CardLabel, DayMark, cn } from '../ui'
import {
  api,
  localDay,
  localMonth,
  relativeTime,
  shiftDay,
  type CalendarData,
  type CheckIn,
  type GroupMemberView,
  type WeekStatus,
} from '../../lib/api'
import { thumbnail } from '../../lib/photo'
import { MemberPicker } from './MemberPicker'
import { CheckInSheet } from './CheckInSheet'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * Calendario mensual de un miembro: 7 columnas de lunes a domingo y una
 * octava con el resultado de la semana (fuego si llegó a la meta, equis si no).
 *
 * Solo los días con check-in son tocables — un día vacío no tiene nada que
 * mostrar, y hacerlo parecer clickeable sería mentirle al dedo.
 */
export function GroupCalendar({ groupId, members }: { groupId: string; members: GroupMemberView[] }) {
  const me = members.find((member) => member.isMe) ?? members[0]
  const [userId, setUserId] = useState(me?.id ?? '')
  const [month, setMonth] = useState(localMonth())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    const query = new URLSearchParams({ userId, month, today: localDay() })
    api
      .get<CalendarData>(`/groups/${groupId}/calendar?${query}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [groupId, userId, month])

  const byDay = useMemo(
    () => new Map((data?.checkIns ?? []).map((checkIn) => [checkIn.day, checkIn])),
    [data],
  )

  const today = localDay()

  return (
    <div className="flex flex-col gap-4">
      <MemberPicker members={members} value={userId} onChange={setUserId} />

      {/* --- Navegación de mes --- */}
      <div className="flex items-center justify-between gap-2">
        <MonthButton onClick={() => setMonth(addMonths(month, -1))} label="Mes anterior">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </MonthButton>
        <p className="text-title text-center flex-1">{monthLabel(month)}</p>
        <MonthButton
          onClick={() => setMonth(addMonths(month, 1))}
          label="Mes siguiente"
          disabled={month >= localMonth()}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </MonthButton>
      </div>

      {loading || !data ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={24} strokeWidth={2.5} className="animate-spin text-accent" />
        </div>
      ) : (
        <>
          <Card className="!p-3">
            {/* Encabezado: 7 días + la columna de la semana */}
            <div className="grid grid-cols-[repeat(7,1fr)_2.25rem] gap-1 mb-1">
              {WEEKDAYS.map((day, index) => (
                <span key={index} className="tape text-text-faint text-center py-1">
                  {day}
                </span>
              ))}
              <span className="tape text-text-faint text-center py-1">×{data.goal}</span>
            </div>

            <div className="flex flex-col gap-1">
              {data.weeks.map((week) => (
                <div key={week.start} className="grid grid-cols-[repeat(7,1fr)_2.25rem] gap-1">
                  {Array.from({ length: 7 }, (_, index) => {
                    const day = shiftDay(week.start, index)
                    const checkIn = byDay.get(day)
                    return (
                      <DayCell
                        key={day}
                        day={day}
                        inMonth={day.slice(0, 7) === data.month}
                        isToday={day === today}
                        hasPhoto={Boolean(checkIn?.photoUrl)}
                        onOpen={checkIn ? () => setOpenId(checkIn.id) : undefined}
                      />
                    )
                  })}
                  <WeekCell status={week.status} count={week.count} goal={week.goal} />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Legend icon={<Flame size={13} strokeWidth={2.5} fill="currentColor" />} className="text-accent">
              semana cumplida
            </Legend>
            <Legend icon={<X size={13} strokeWidth={3} />} className="text-danger">
              no llegó a la meta
            </Legend>
            <Legend icon={<span className="size-2.5 rounded-[3px] bg-success" />} className="text-text-faint">
              día con entreno
            </Legend>
          </div>

          <LastWorkoutCard userId={userId} onOpen={setOpenId} />
        </>
      )}

      <CheckInSheet checkInId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

/* --- Celdas -------------------------------------------------------------- */

function DayCell({
  day,
  inMonth,
  isToday,
  hasPhoto,
  onOpen,
}: {
  day: string
  inMonth: boolean
  isToday: boolean
  hasPhoto: boolean
  onOpen?: () => void
}) {
  const number = Number(day.slice(8))
  const base = 'relative aspect-square grid place-items-center rounded-[var(--radius-xs)] text-label font-bold'

  // Sin check-in no hay nada que abrir: se dibuja como texto, no como botón.
  if (!onOpen) {
    return (
      <span
        className={cn(
          base,
          inMonth ? 'text-ink-400' : 'text-ink-700',
          isToday && 'ring-2 ring-accent text-accent',
        )}
      >
        {number}
      </span>
    )
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onOpen}
      aria-label={`Ver el entrenamiento del ${number}`}
      className={cn(
        base,
        'cursor-pointer bg-success text-ink-1000 shadow-[0_4px_12px_-6px_var(--color-success)]',
        !inMonth && 'opacity-45',
        isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
      )}
    >
      {number}
      {hasPhoto && <span className="absolute bottom-1 size-1 rounded-full bg-ink-1000/60" />}
    </motion.button>
  )
}

function WeekCell({ status, count, goal }: { status: WeekStatus; count: number; goal: number }) {
  if (status === 'future') return <span className="aspect-square" />

  if (status === 'met') {
    return (
      <span
        className="aspect-square grid place-items-center rounded-[var(--radius-xs)] bg-accent-tint border border-accent-line text-accent"
        title={`${count} de ${goal}`}
      >
        <Flame size={16} strokeWidth={2.5} fill="currentColor" />
      </span>
    )
  }

  if (status === 'current') {
    return (
      <span
        className="aspect-square grid place-items-center rounded-[var(--radius-xs)] border border-ink-700 text-text-faint tape"
        title={`Semana en curso: ${count} de ${goal}`}
      >
        {count}/{goal}
      </span>
    )
  }

  return (
    <span
      className="aspect-square grid place-items-center rounded-[var(--radius-xs)] hatch border border-danger/40 text-danger"
      title={`${count} de ${goal}`}
    >
      <X size={15} strokeWidth={3} />
    </span>
  )
}

function MonthButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-200 hover:border-ink-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
    >
      {children}
    </button>
  )
}

function Legend({
  icon,
  className,
  children,
}: {
  icon: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('grid place-items-center', className)}>{icon}</span>
      <span className="tape text-text-faint">{children}</span>
    </span>
  )
}

/**
 * Último entrenamiento del miembro elegido. Queda fija debajo del calendario
 * sin importar qué día se esté mirando, y usa el endpoint rápido de la fase
 * anterior (`/checkins/latest`).
 */
function LastWorkoutCard({ userId, onOpen }: { userId: string; onOpen: (id: string) => void }) {
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get<{ checkIn: CheckIn | null }>(`/checkins/latest?userId=${encodeURIComponent(userId)}`)
      .then(({ checkIn: latest }) => setCheckIn(latest))
      .catch(() => setCheckIn(null))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <section className="flex flex-col gap-2">
      <CardLabel className="mb-0">Último entrenamiento</CardLabel>

      {loading ? (
        <Card className="h-20 grid place-items-center">
          <Loader2 size={20} strokeWidth={2.5} className="animate-spin text-ink-500" />
        </Card>
      ) : !checkIn ? (
        <Card tone="outline">
          <p className="text-caption text-text-muted">Todavía no marcó ningún entrenamiento.</p>
        </Card>
      ) : (
        <button type="button" onClick={() => onOpen(checkIn.id)} className="pressable text-left cursor-pointer">
          <Card tone="accent" notch className="flex items-center gap-3 !p-3.5">
            <DayMark state="done" size="lg" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold leading-tight">{relativeTime(checkIn.createdAt)}</span>
              <span className="block text-caption text-text-muted truncate">
                {checkIn.note ?? 'Marcó que entrenó, sin descripción.'}
              </span>
            </span>
            {checkIn.photoUrl && (
              <img
                src={thumbnail(checkIn.photoUrl, 120)}
                alt=""
                className="size-14 rounded-[var(--radius-md)] object-cover border border-accent-line shrink-0"
              />
            )}
          </Card>
        </button>
      )}
    </section>
  )
}

/* --- Fechas -------------------------------------------------------------- */

function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const label = new Date(Date.UTC(year!, monthNumber! - 1, 1)).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
