import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Egg,
  Flame,
  Loader2,
  Share2,
  Turtle,
} from 'lucide-react'
import { Avatar, Button, Card, CardLabel, cn } from '../../components/ui'
import { api, localDay, localMonth, type Recap, type RecapMember, type RecapTitle } from '../../lib/api'
import { useProfile } from '../../profile/useProfile'

/**
 * Recap mensual del grupo.
 *
 * El mes en curso se calcula al vuelo y se avisa que es provisorio; los meses
 * cerrados salen del recap congelado que dejó el job del día 1.
 *
 * La pantalla se lee de arriba abajo como una historia: cuánto entrenó el grupo,
 * quién quedó arriba y quién abajo, y recién después la tabla con todos.
 * La navegación entre meses es con flechas y nada más: no hay un solo campo de
 * texto en toda la pantalla.
 */

/** Con qué se ordena y qué número se muestra a la derecha de la tabla. */
type Metric = 'entrenos' | 'metas'

export function RecapScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [month, setMonth] = useState(localMonth())
  const [recap, setRecap] = useState<Recap | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [metric, setMetric] = useState<Metric>('entrenos')

  useEffect(() => {
    setLoading(true)
    api
      .get<Recap>(`/groups/${id}/recap?month=${month}`)
      .then(setRecap)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, month])

  const ranked = useMemo(() => rankBy(recap?.members ?? [], metric), [recap, metric])
  /** Semanas del mes: manda el que más trae, así el ancho no baila por fila. */
  const weekCount = ranked.reduce((most, member) => Math.max(most, member.weeklyCheckIns?.length ?? 0), 0)

  if (notFound) {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center px-5">
        <div className="text-center flex flex-col gap-4">
          <p className="text-title">No pudimos armar el recap.</p>
          <Button variant="secondary" onClick={() => navigate(`/groups/${id}`)}>
            Volver al grupo
          </Button>
        </div>
      </div>
    )
  }

  const atStart = recap ? month <= recap.earliestMonth : true
  const atEnd = month >= localMonth()

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-5">
        {/* --- Título y mes en la misma línea: el mes es el control de toda
                la pantalla, no un bloque más. --- */}
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate(`/groups/${id}`)}
            aria-label="Volver al grupo"
            className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-headline leading-tight">Recap</h1>
            {recap && <p className="tape text-text-faint truncate">{recap.groupName}</p>}
          </div>

          <div className="flex items-center gap-0.5 h-11 px-1 shrink-0 rounded-[var(--radius-pill)] bg-ink-900 border border-ink-700">
            <NavButton onClick={() => setMonth(addMonths(month, -1))} label="Mes anterior" disabled={atStart}>
              <ChevronLeft size={18} strokeWidth={2.5} />
            </NavButton>
            <span className="px-1 text-label whitespace-nowrap">{shortMonthLabel(month)}</span>
            <NavButton onClick={() => setMonth(addMonths(month, 1))} label="Mes siguiente" disabled={atEnd}>
              <ChevronRight size={18} strokeWidth={2.5} />
            </NavButton>
          </div>
        </header>

        {loading || !recap ? (
          <div className="grid place-items-center py-20">
            <Loader2 size={26} strokeWidth={2.5} className="animate-spin text-accent" />
          </div>
        ) : recap.completion === null ? (
          <Card tone="outline" className="text-center">
            <p className="text-body text-ink-200">Todavía no hay nada que contar.</p>
            <p className="text-caption text-text-faint mt-1">
              El recap empieza cuando termina la primera semana del mes.
            </p>
          </Card>
        ) : (
          <>
            <GroupCard recap={recap} month={month} />

            {/* --- Los dos extremos del mes, uno al lado del otro --- */}
            <div className={cn('grid gap-3', recap.best && (recap.worst || recap.everyoneDelivered) && 'grid-cols-2')}>
              {recap.best && (
                <Highlight
                  label="La rompió"
                  icon={<Crown size={14} strokeWidth={2.5} />}
                  member={recap.best}
                  tone="best"
                  line={`Cumplió ${recap.best.weeksMet} de ${recap.best.weeksEvaluated} semanas${
                    recap.best.longestStreak > 1 ? `, con ${recap.best.longestStreak} días seguidos` : ''
                  }.`}
                />
              )}

              {recap.everyoneDelivered ? (
                <Card className="flex flex-col gap-2.5 border-success/45 bg-success-tint !p-4">
                  <span className="tape flex items-center gap-1.5 text-success">
                    <Flame size={14} strokeWidth={2.5} fill="currentColor" />
                    Cumplieron todos
                  </span>
                  <p className="text-caption text-text-muted">
                    Este mes no hay a quién echarle carrilla. Disfrútenlo, no va a durar.
                  </p>
                </Card>
              ) : (
                recap.worst && (
                  <Highlight
                    label="El más huevón"
                    icon={<Turtle size={14} strokeWidth={2.5} />}
                    member={recap.worst}
                    tone="worst"
                    line={
                      recap.worst.weeksMet === 0
                        ? `Cero de ${recap.worst.weeksEvaluated} semanas. Ni una.`
                        : `Cumplió ${recap.worst.weeksMet} de ${recap.worst.weeksEvaluated} semanas.`
                    }
                  />
                )
              )}
            </div>

            {/* --- Tabla --- */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardLabel className="mb-0">Cómo le fue a cada uno</CardLabel>
                <button
                  type="button"
                  onClick={() => setMetric((current) => (current === 'entrenos' ? 'metas' : 'entrenos'))}
                  className="pressable tape flex items-center gap-1 text-accent cursor-pointer"
                >
                  {metric === 'entrenos' ? 'Entrenos' : 'Metas'}
                  <ChevronDown size={12} strokeWidth={3} />
                </button>
              </div>

              <div className="rounded-[var(--radius-lg)] bg-surface border border-line-soft overflow-hidden">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-soft">
                  <span className="tape text-text-faint w-4 shrink-0">#</span>
                  <span className="tape text-text-faint flex-1 min-w-0">Quién</span>
                  {weekCount > 0 && (
                    // El ancho sale de los cuadritos de abajo para que el
                    // encabezado caiga justo sobre la columna que nombra.
                    <span
                      className="tape text-text-faint shrink-0 truncate"
                      style={{ width: weekCount * 16 + (weekCount - 1) * 4 }}
                    >
                      Semanas
                    </span>
                  )}
                  <span className="tape text-text-faint w-10 text-right shrink-0">
                    {metric === 'entrenos' ? 'Entr.' : 'Metas'}
                  </span>
                </div>

                {ranked.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
                  >
                    <Row
                      member={member}
                      position={index + 1}
                      metric={metric}
                      weeksEvaluated={recap.weeksEvaluated}
                      isMe={member.id === profile?.id}
                    />
                  </motion.div>
                ))}

                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <Legend className="bg-accent" label="Mejor semana" />
                  <Legend className="bg-accent-tint-strong" label="Entrenó" />
                  <Legend className="bg-ink-800" label="Nada" />
                </div>
              </div>
            </section>

            <Footer recap={recap} ranked={ranked} metric={metric} month={month} meId={profile?.id} />
          </>
        )}
      </div>
    </div>
  )
}

/* --- Tarjeta de arriba ---------------------------------------------------- */

/**
 * Entrenos del grupo contra su techo: la meta de cada uno por cada semana que
 * ya terminó. Es la misma vara con la que se mide todo el recap, pero contada
 * en entrenos, que es lo que la gente siente.
 */
function GroupCard({ recap, month }: { recap: Recap; month: string }) {
  const possible = recap.possibleCheckIns ?? 0
  const ratio = possible > 0 ? Math.min(1, recap.totalCheckIns / possible) : 0

  const today = localDay()
  const elapsed = recap.partial && month === today.slice(0, 7) ? Number(today.slice(8, 10)) : daysInMonth(month)
  const pace = recap.partial && elapsed > 0 ? Math.round((recap.totalCheckIns / elapsed) * daysInMonth(month)) : null

  // Un solo `weeklyCheckIns` por miembro; el del grupo es la suma columna a columna.
  const weeks = useMemo(() => {
    const total: number[] = []
    for (const member of recap.members) {
      ;(member.weeklyCheckIns ?? []).forEach((count, index) => {
        total[index] = (total[index] ?? 0) + count
      })
    }
    return total
  }, [recap])

  const goals = new Set(recap.members.map((member) => member.goal))
  const weeksMet = recap.members.reduce((count, member) => count + member.weeksMet, 0)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardLabel className="mb-0">Entrenos del grupo</CardLabel>
        <span
          className={cn(
            'tape shrink-0 -mt-0.5 px-2 py-1 rounded-[var(--radius-pill)] border',
            recap.partial ? 'bg-accent-tint border-accent-line text-accent' : 'bg-ink-850 border-ink-700 text-ink-300',
          )}
        >
          {recap.partial ? `En curso · día ${elapsed}` : 'Mes cerrado'}
        </span>
      </div>

      <p className="flex items-baseline gap-2">
        <span className="num text-stat-xl text-accent leading-none">{recap.totalCheckIns}</span>
        <span className="text-body text-text-muted">
          de <span className="num text-ink-100">{possible}</span> posibles
        </span>
      </p>

      <Meter value={ratio} />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-caption text-text-muted">
          <span className="num text-ink-100">{Math.round(ratio * 100)}%</span> de la meta
        </span>
        {pace !== null && (
          <span className="text-caption text-text-faint text-right">
            Ritmo para cerrar el mes: <span className="num text-ink-100">{pace}</span>
          </span>
        )}
      </div>

      {/* --- Semana a semana. Un mes tiene 4, 5 o 6 semanas, así que las
              columnas se reparten el ancho en lugar de tener medida fija. --- */}
      <div className="flex items-end gap-4 border-t border-line-soft pt-3.5">
        {weeks.length > 0 && (
          <div className="flex-1 min-w-0">
            <CardLabel className="mb-2">Semana a semana</CardLabel>
            <div className="flex items-end gap-1.5">
              {weeks.map((count, index) => (
                <WeekBar
                  key={index}
                  count={count}
                  max={Math.max(...weeks, 1)}
                  week={index + 1}
                  pending={index >= recap.weeksEvaluated}
                />
              ))}
            </div>
          </div>
        )}

        <div className="shrink-0 text-right">
          <CardLabel className="mb-2">{goals.size === 1 ? `Metas ${[...goals][0]}×` : 'Metas'}</CardLabel>
          <p className="leading-none">
            <span className="num text-title text-ink-100">{weeksMet}</span>
            <span className="tape text-text-faint ml-1.5">logradas</span>
          </p>
        </div>
      </div>
    </Card>
  )
}

/** Columna de una semana: el número arriba, la barra proporcional abajo. */
function WeekBar({ count, max, week, pending }: { count: number; max: number; week: number; pending: boolean }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
      <span className={cn('num text-label', pending ? 'text-ink-500' : 'text-ink-100')}>{count}</span>
      <span className="w-full h-1.5 rounded-full bg-ink-800 overflow-hidden">
        <motion.span
          className={cn('block h-full rounded-full origin-left', pending ? 'bg-ink-600' : 'bg-accent')}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: count / max }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
      <span className="tape text-text-faint">S{week}</span>
    </div>
  )
}

/* --- Tabla ---------------------------------------------------------------- */

function Row({
  member,
  position,
  metric,
  weeksEvaluated,
  isMe,
}: {
  member: RecapMember
  position: number
  metric: Metric
  weeksEvaluated: number
  isMe: boolean
}) {
  const weeks = member.weeklyCheckIns ?? []
  const best = bestWeek(weeks)

  return (
    <Link
      to={`/u/${member.id}`}
      className={cn(
        'pressable flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-soft hover:bg-ink-850',
        isMe && 'bg-ink-850',
      )}
    >
      <span className={cn('num text-label w-4 shrink-0', position === 1 ? 'text-accent' : 'text-ink-500')}>
        {position}
      </span>
      <Avatar name={member.name} image={member.image} size={34} className={isMe ? 'border-accent' : undefined} />

      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="font-bold truncate leading-tight">{member.name}</span>
        {member.title && <TitleBadge title={member.title} />}
        {isMe && (
          <span className="tape shrink-0 h-5 px-1.5 grid place-items-center rounded-[var(--radius-pill)] border border-accent-line bg-accent-tint text-accent">
            Tú
          </span>
        )}
      </span>

      <span className="flex items-center gap-1 shrink-0" aria-hidden>
        {weeks.map((count, index) => (
          <span
            key={index}
            className={cn(
              'size-4 rounded-[5px]',
              count === 0 && index >= weeksEvaluated
                ? 'border border-ink-800'
                : count === 0
                  ? 'bg-ink-800'
                  : index === best
                    ? 'bg-accent'
                    : 'bg-accent-tint-strong',
            )}
          />
        ))}
      </span>

      <span className="num text-title text-ink-100 w-10 text-right shrink-0">
        {metric === 'entrenos' ? member.checkIns : `${member.weeksMet}/${member.weeksEvaluated}`}
      </span>
    </Link>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="tape text-text-faint flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-[3px]', className)} />
      {label}
    </span>
  )
}

/* --- Pie ------------------------------------------------------------------ */

/**
 * Cuánto falta y qué habría que hacer. Solo mira al que está leyendo: el recap
 * sirve para picarse, y para eso el dato que importa es el propio.
 */
function Footer({
  recap,
  ranked,
  metric,
  month,
  meId,
}: {
  recap: Recap
  ranked: RecapMember[]
  metric: Metric
  month: string
  meId?: string
}) {
  const [copied, setCopied] = useState(false)

  const today = localDay()
  const daysLeft =
    recap.partial && month === today.slice(0, 7) ? daysInMonth(month) - Number(today.slice(8, 10)) : 0

  const position = ranked.findIndex((member) => member.id === meId)
  const me = position >= 0 ? ranked[position]! : null
  const third = ranked[2]
  const missing = me && third && position > 2 ? metricValue(third, metric) - metricValue(me, metric) + 1 : 0

  const share = async () => {
    const text = shareText(recap, month)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Recap · ${recap.groupName}`, text })
        return
      }
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* lo canceló o no hay portapapeles: no hay nada que avisar */
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-10 rounded-[var(--radius-lg)] bg-ink-900 border border-ink-700">
      <p className="flex-1 min-w-0 text-caption text-text-muted">
        {!recap.partial ? (
          verdict(recap.completion ?? 0)
        ) : (
          <>
            <span className="text-ink-100">
              {daysLeft === 0 ? 'Último día del mes.' : `Faltan ${daysLeft} días.`}
            </span>{' '}
            {missing > 0
              ? `Con ${missing} ${metric === 'entrenos' ? (missing === 1 ? 'entreno' : 'entrenos') : missing === 1 ? 'meta' : 'metas'} más entras al podio.`
              : me && position >= 0
                ? 'Estás en el podio: no lo sueltes.'
                : 'Todavía se puede dar vuelta.'}
          </>
        )}
      </p>
      <Button
        size="sm"
        onClick={() => void share()}
        icon={copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={2.5} />}
      >
        {copied ? 'Copiado' : 'Compartir'}
      </Button>
    </div>
  )
}

/* --- Piezas -------------------------------------------------------------- */

const TITLE_LABEL: Record<RecapTitle, string> = {
  rey: 'Rey',
  enrachado: 'Enrachado',
  huevon: 'Huevón',
  pollito: 'Pollito',
}

const TITLE_TONE: Record<RecapTitle, string> = {
  rey: 'bg-accent-tint border-accent-line text-accent',
  enrachado: 'bg-success-tint border-success/40 text-success',
  huevon: 'bg-danger-tint border-danger/40 text-danger',
  pollito: 'bg-warning-tint border-warning/40 text-warning',
}

function TitleBadge({ title }: { title: RecapTitle }) {
  const Icon = title === 'rey' ? Crown : title === 'enrachado' ? Flame : title === 'huevon' ? Turtle : Egg
  return (
    <span
      className={cn(
        'tape inline-flex items-center gap-1 h-5 pl-1.5 pr-2 rounded-[var(--radius-pill)] border shrink-0',
        TITLE_TONE[title],
      )}
    >
      <Icon size={10} strokeWidth={2.5} />
      {TITLE_LABEL[title]}
    </span>
  )
}

function Highlight({
  label,
  icon,
  member,
  line,
  tone,
}: {
  label: string
  icon: React.ReactNode
  member: RecapMember
  line: string
  tone: 'best' | 'worst'
}) {
  const best = tone === 'best'
  return (
    <Link to={`/u/${member.id}`} className="pressable block">
      <Card
        notch={best}
        className={cn(
          'h-full flex flex-col gap-2.5 !p-4',
          best ? 'bg-accent-tint border-accent-line' : 'bg-danger-tint border-danger/40',
        )}
      >
        <span className={cn('tape flex items-center gap-1.5', best ? 'text-accent' : 'text-danger')}>
          {icon}
          {label}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={member.name} image={member.image} size={32} />
          <span className="font-bold truncate leading-tight">{member.name}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className={cn('num text-stat leading-none', best ? 'text-accent' : 'text-danger')}>
            {member.completion === null ? '—' : `${Math.round(member.completion * 100)}%`}
          </span>
          {member.title && <TitleBadge title={member.title} />}
        </div>

        <p className="text-caption text-text-muted">{line}</p>
      </Card>
    </Link>
  )
}

/** Barra de cumplimiento. Cambia de color según qué tan mal vienen. */
function Meter({ value, className }: { value: number; className?: string }) {
  const tone = value >= 0.75 ? 'bg-success' : value >= 0.4 ? 'bg-warning' : 'bg-danger'
  return (
    <div className={cn('h-2 rounded-full bg-ink-800 overflow-hidden', className)}>
      <motion.div
        className={cn('h-full rounded-full origin-left', tone)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: value }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

function NavButton({
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
      className="pressable grid place-items-center size-9 shrink-0 rounded-full text-ink-200 hover:bg-ink-850 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
    >
      {children}
    </button>
  )
}

/* --- Cálculo -------------------------------------------------------------- */

function metricValue(member: RecapMember, metric: Metric): number {
  return metric === 'entrenos' ? member.checkIns : member.weeksMet
}

/** Ordena por la métrica elegida; la otra y la racha desempatan. */
function rankBy(members: RecapMember[], metric: Metric): RecapMember[] {
  const other: Metric = metric === 'entrenos' ? 'metas' : 'entrenos'
  return [...members].sort(
    (a, b) =>
      metricValue(b, metric) - metricValue(a, metric) ||
      metricValue(b, other) - metricValue(a, other) ||
      b.longestStreak - a.longestStreak ||
      a.name.localeCompare(b.name),
  )
}

/** La mejor semana solo se marca si es una sola: un empate no es un pico. */
function bestWeek(weeks: number[]): number {
  let best = -1
  let tied = false
  weeks.forEach((count, index) => {
    if (count === 0) return
    if (best < 0 || count > weeks[best]!) {
      best = index
      tied = false
    } else if (count === weeks[best]!) {
      tied = true
    }
  })
  return tied ? -1 : best
}

/* --- Texto --------------------------------------------------------------- */

function shareText(recap: Recap, month: string): string {
  const possible = recap.possibleCheckIns ?? 0
  const lines = [
    `Recap de ${recap.groupName} · ${monthLabel(month)}`,
    possible > 0
      ? `${recap.totalCheckIns} entrenos de ${possible} posibles (${Math.round((recap.totalCheckIns / possible) * 100)}%)`
      : `${recap.totalCheckIns} entrenos`,
  ]
  if (recap.best) lines.push(`Va arriba ${recap.best.name} con ${recap.best.checkIns} entrenos.`)
  return lines.join('\n')
}

function verdict(completion: number): string {
  if (completion >= 0.9) return 'Impecable. Da un poquito de miedo.'
  if (completion >= 0.75) return 'Muy bien. El viaje está cerca.'
  if (completion >= 0.5) return 'Ni fu ni fa. Se puede más.'
  if (completion >= 0.25) return 'Flojo. Miren la tabla y saquen conclusiones.'
  return 'Un desastre. Hablen entre ustedes.'
}

function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year!, monthNumber! - 1 + delta, 1)).toISOString().slice(0, 7)
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate()
}

function monthLabel(month: string): string {
  return formatMonth(month, 'long')
}

/** "Ago 2026" — el que va en la píldora del encabezado. */
function shortMonthLabel(month: string): string {
  return formatMonth(month, 'short').replace('.', '')
}

function formatMonth(month: string, style: 'long' | 'short'): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const label = new Date(Date.UTC(year!, monthNumber! - 1, 1)).toLocaleDateString('es', {
    month: style,
    year: 'numeric',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
