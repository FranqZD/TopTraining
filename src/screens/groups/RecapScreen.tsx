import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, Flame, Loader2, Turtle } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, cn } from '../../components/ui'
import { api, localMonth, type Recap, type RecapMember } from '../../lib/api'

/**
 * Recap mensual del grupo.
 *
 * El mes en curso se calcula al vuelo y se avisa que es provisorio; los meses
 * cerrados salen del recap congelado que dejó el job del día 1.
 *
 * La navegación entre meses es con flechas y nada más: no hay un solo campo de
 * texto en toda la pantalla.
 */
export function RecapScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [month, setMonth] = useState(localMonth())
  const [recap, setRecap] = useState<Recap | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get<Recap>(`/groups/${id}/recap?month=${month}`)
      .then(setRecap)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, month])

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
      <div className="mx-auto w-full max-w-[440px] px-5 py-6 flex flex-col gap-6">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate(`/groups/${id}`)}
            aria-label="Volver al grupo"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="text-headline leading-tight">Recap</h1>
            {recap && <p className="tape text-text-faint truncate">{recap.groupName}</p>}
          </div>
        </header>

        {/* --- Navegación de mes --- */}
        <div className="flex items-center justify-between gap-2">
          <NavButton onClick={() => setMonth(addMonths(month, -1))} label="Mes anterior" disabled={atStart}>
            <ChevronLeft size={20} strokeWidth={2.5} />
          </NavButton>
          <div className="flex-1 text-center min-w-0">
            <p className="text-title truncate">{monthLabel(month)}</p>
            {recap?.partial && <p className="tape text-accent">mes en curso · parcial</p>}
          </div>
          <NavButton onClick={() => setMonth(addMonths(month, 1))} label="Mes siguiente" disabled={atEnd}>
            <ChevronRight size={20} strokeWidth={2.5} />
          </NavButton>
        </div>

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
            {/* --- Cumplimiento general --- */}
            <Card tone="accent" notch>
              <CardLabel>Cumplimiento del grupo</CardLabel>
              <div className="flex items-end justify-between gap-4">
                <p className="num text-stat-xl text-accent">{Math.round(recap.completion * 100)}%</p>
                <p className="text-caption text-text-muted text-right">
                  {recap.weeksEvaluated} {recap.weeksEvaluated === 1 ? 'semana' : 'semanas'} ·{' '}
                  <span className="num text-ink-100">{recap.totalCheckIns}</span> entrenos
                </p>
              </div>
              <Meter value={recap.completion} className="mt-3" />
              <p className="text-caption text-text-muted mt-2">{verdict(recap.completion)}</p>
            </Card>

            {/* --- El mejor --- */}
            {recap.best && (
              <Highlight
                label="La rompió"
                icon={<Crown size={18} strokeWidth={2.5} />}
                member={recap.best}
                tone="best"
                line={`Cumplió ${recap.best.weeksMet} de ${recap.best.weeksEvaluated} semanas${
                  recap.best.longestStreak > 1 ? `, con ${recap.best.longestStreak} días seguidos` : ''
                }.`}
              />
            )}

            {/* --- El peor, o la felicitación si zafaron todos --- */}
            {recap.everyoneDelivered ? (
              <Card className="flex items-center gap-3.5 border-success/45 bg-success-tint">
                <span className="grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-success text-ink-1000">
                  <Flame size={20} strokeWidth={2.5} fill="currentColor" />
                </span>
                <div>
                  <p className="font-bold leading-tight">Cumplieron todos</p>
                  <p className="text-caption text-text-muted">
                    Este mes no hay a quién echarle carrilla. Disfrútenlo, no va a durar.
                  </p>
                </div>
              </Card>
            ) : (
              recap.worst && (
                <Highlight
                  label="El más huevón del grupo"
                  icon={<Turtle size={18} strokeWidth={2.5} />}
                  member={recap.worst}
                  tone="worst"
                  line={
                    recap.worst.weeksMet === 0
                      ? `Cero de ${recap.worst.weeksEvaluated} semanas. Ni una.`
                      : `Cumplió ${recap.worst.weeksMet} de ${recap.worst.weeksEvaluated} semanas. Se puede peor, pero hay que esforzarse.`
                  }
                />
              )
            )}

            {/* --- Tabla --- */}
            <section className="flex flex-col gap-2">
              <CardLabel className="mb-0">Cómo le fue a cada uno</CardLabel>
              {recap.members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index, 8) * 0.04 }}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] bg-surface border border-line-soft"
                >
                  <span className="num text-label text-ink-500 w-4 shrink-0">{index + 1}</span>
                  <Avatar name={member.name} image={member.image} size={40} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate leading-tight">{member.name}</span>
                    <span className="block tape text-text-faint">
                      meta {member.goal}× · <span className="num">{member.checkIns}</span> entrenos
                      {member.longestStreak > 1 && (
                        <>
                          {' · '}
                          <span className="num">{member.longestStreak}</span> seguidos
                        </>
                      )}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="num text-title text-ink-100">
                      {member.weeksMet}/{member.weeksEvaluated}
                    </span>
                    <span className="block tape text-text-faint">semanas</span>
                  </span>
                </motion.div>
              ))}
            </section>

            <p className="tape text-ink-500 text-center pb-10">
              {recap.partial ? 'Se actualiza solo hasta que termine el mes' : 'Recap cerrado'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* --- Piezas -------------------------------------------------------------- */

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
    <Card
      notch={best}
      className={cn(
        'flex flex-col gap-3',
        best ? 'bg-accent-tint border-accent-line' : 'bg-danger-tint border-danger/40',
      )}
    >
      <span className={cn('tape flex items-center gap-2', best ? 'text-accent' : 'text-danger')}>
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-3.5">
        <Avatar name={member.name} image={member.image} size={52} />
        <div className="min-w-0">
          <p className="text-title truncate leading-tight">{member.name}</p>
          <p className="text-caption text-text-muted">{line}</p>
        </div>
        <span className="ml-auto text-right shrink-0">
          <span className={cn('num text-stat', best ? 'text-accent' : 'text-danger')}>
            {member.completion === null ? '—' : `${Math.round(member.completion * 100)}%`}
          </span>
        </span>
      </div>
    </Card>
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
      className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-200 hover:border-ink-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
    >
      {children}
    </button>
  )
}

/* --- Texto --------------------------------------------------------------- */

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

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const label = new Date(Date.UTC(year!, monthNumber! - 1, 1)).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
