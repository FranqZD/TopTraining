import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Flame, Loader2 } from 'lucide-react'
import { Card, Sheet, cn } from '../ui'
import {
  api,
  localDay,
  localMonth,
  shiftDay,
  type FeedItem,
  type FeedPage,
  type GroupCalendarData,
  type GroupWeekStatus,
  type VoteResult,
} from '../../lib/api'
import { FeedCard } from './FeedCard'
import { CheckInSheet } from './CheckInSheet'
import { applyVoteResult } from './VoteBar'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const GRID = 'grid grid-cols-[repeat(7,minmax(0,1fr))_2.75rem] gap-1'

/**
 * Calendario del grupo entero: un día verde es "alguien entrenó", y la octava
 * columna son llamas — una por cada persona que cumplió su meta esa semana.
 * Tocar un día abre el feed de ese día, no el de una sola persona.
 */
export function GroupCalendar({ groupId }: { groupId: string }) {
  const [month, setMonth] = useState(localMonth())
  const [data, setData] = useState<GroupCalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [openDay, setOpenDay] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams({ month, today: localDay() })
    api
      .get<GroupCalendarData>(`/groups/${groupId}/calendar?${query}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [groupId, month])

  const byDay = useMemo(() => new Map((data?.days ?? []).map((entry) => [entry.day, entry])), [data])
  const today = localDay()

  return (
    <div className="flex flex-col gap-4">
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
            <div className={cn(GRID, 'mb-1')}>
              {WEEKDAYS.map((day, index) => (
                <span key={index} className="tape text-text-faint text-center py-1">
                  {day}
                </span>
              ))}
              <span className="grid place-items-center text-accent" aria-label="Cumplieron la semana">
                <Flame size={12} strokeWidth={2.5} fill="currentColor" />
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {data.weeks.map((week) => (
                <div key={week.start} className={GRID}>
                  {Array.from({ length: 7 }, (_, index) => {
                    const day = shiftDay(week.start, index)
                    const entry = byDay.get(day)
                    const count = entry?.count ?? 0
                    return (
                      <DayCell
                        key={day}
                        day={day}
                        inMonth={day.slice(0, 7) === data.month}
                        isToday={day === today}
                        count={count}
                        hasPhoto={Boolean(entry?.hasPhoto)}
                        onOpen={count > 0 ? () => setOpenDay(day) : undefined}
                      />
                    )
                  })}
                  <WeekCell status={week.status} metCount={week.metCount} memberCount={week.memberCount} />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Legend
              icon={<Flame size={13} strokeWidth={2.5} fill="currentColor" />}
              className="text-accent"
            >
              uno por cada quien cumplió
            </Legend>
            <Legend icon={<span className="size-2.5 rounded-[3px] bg-success" />} className="text-text-faint">
              alguien entrenó
            </Legend>
          </div>
        </>
      )}

      <DaySheet groupId={groupId} day={openDay} onClose={() => setOpenDay(null)} />
    </div>
  )
}

/* --- Celdas -------------------------------------------------------------- */

function DayCell({
  day,
  inMonth,
  isToday,
  count,
  hasPhoto,
  onOpen,
}: {
  day: string
  inMonth: boolean
  isToday: boolean
  count: number
  hasPhoto: boolean
  onOpen?: () => void
}) {
  const number = Number(day.slice(8))
  const base = 'relative aspect-square grid place-items-center rounded-[var(--radius-xs)] text-label font-bold'

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
      aria-label={`Ver los entrenos del ${number}${count > 1 ? `: ${count} personas` : ''}`}
      className={cn(
        base,
        'cursor-pointer bg-success text-ink-1000 shadow-[0_4px_12px_-6px_var(--color-success)]',
        !inMonth && 'opacity-45',
        isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
      )}
    >
      {number}
      {count > 1 && (
        <span className="absolute bottom-0.5 num text-micro leading-none text-ink-1000/75">{count}</span>
      )}
      {hasPhoto && count <= 1 && <span className="absolute bottom-1 size-1 rounded-full bg-ink-1000/60" />}
    </motion.button>
  )
}

function WeekCell({
  status,
  metCount,
  memberCount,
}: {
  status: GroupWeekStatus
  metCount: number
  memberCount: number
}) {
  if (status === 'future' || metCount === 0) {
    return <span className="min-h-0" />
  }

  return (
    <span
      className="grid place-items-center self-stretch min-h-0"
      title={`${metCount} de ${memberCount} cumplieron`}
      aria-label={`${metCount} de ${memberCount} cumplieron la meta`}
    >
      <span className={cn('grid gap-px', metCount <= 3 ? 'grid-cols-1' : 'grid-cols-2')}>
        {Array.from({ length: metCount }, (_, index) => (
          <Flame key={index} size={11} strokeWidth={2.5} fill="currentColor" className="text-accent" />
        ))}
      </span>
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
 * Feed de un día: lo que subió cada quien. Misma tarjeta que el feed del
 * grupo, para que abrir el calendario no se sienta como otra app.
 */
function DaySheet({ groupId, day, onClose }: { groupId: string; day: string | null; onClose: () => void }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [flexToday, setFlexToday] = useState<string | null>(null)

  useEffect(() => {
    if (!day) {
      setItems([])
      setOpenId(null)
      setFlexToday(null)
      return
    }
    setLoading(true)
    const query = new URLSearchParams({ day, today: localDay(), limit: '50' })
    api
      .get<FeedPage>(`/groups/${groupId}/feed?${query}`)
      .then((page) => {
        setItems(page.items)
        setFlexToday(page.flexToday)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [groupId, day])

  const onVoted = (checkInId: string, result: VoteResult) => {
    setItems((current) => applyVoteResult(current, checkInId, result))
    setFlexToday(result.flexToday)
  }

  return (
    <>
      <Sheet open={day !== null} onClose={onClose} title={day ? <span className="text-title">{dayLabel(day)}</span> : undefined}>
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 size={24} strokeWidth={2.5} className="animate-spin text-accent" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-caption text-text-muted py-8 text-center">Nadie marcó este día.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <FeedCard
                key={item.id}
                item={item}
                index={index}
                onOpen={() => setOpenId(item.id)}
                onAuthor={(userId) => {
                  onClose()
                  navigate(`/u/${userId}`)
                }}
                flexToday={flexToday}
                onVoted={onVoted}
              />
            ))}
          </div>
        )}
      </Sheet>

      <CheckInSheet
        checkInId={openId}
        onClose={() => setOpenId(null)}
        onCommented={() =>
          setItems((current) =>
            current.map((item) => (item.id === openId ? { ...item, commentCount: item.commentCount + 1 } : item)),
          )
        }
        onVoted={onVoted}
      />
    </>
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

function dayLabel(day: string): string {
  if (day === localDay()) return 'Hoy'
  const [year, month, date] = day.split('-').map(Number)
  const label = new Date(Date.UTC(year!, month! - 1, date)).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
