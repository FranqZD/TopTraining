import { motion } from 'motion/react'
import { Check, Flame, X } from 'lucide-react'
import { cn } from './cn'

/**
 * ICONOGRAFÍA DE ESTADO — las tres marcas que se repiten en feed, calendario
 * y lista de amigos. Se leen de un vistazo por FORMA, no solo por color
 * (importa para daltonismo y para miniaturas de 20px en el calendario):
 *
 *   CUMPLIDO   → cuadrado SÓLIDO relleno, check casi negro encima.
 *   NO CUMPLIDO→ cuadrado HUECO con trama diagonal y una equis roja.
 *   SIN DATOS  → cuadrado hueco gris, sin glifo.
 *   RACHA      → píldora con llama + número, en el acento del tema.
 *
 * Regla de color (única en toda la app):
 *   accent = racha viva · success = día cumplido · warning = en riesgo
 *   danger = día perdido / racha rota · idle = sin actividad
 *
 * Toda la iconografía sale de lucide-react. No se mezcla con otros sets.
 */

type MarkSize = 'sm' | 'md' | 'lg'

const BOX: Record<MarkSize, string> = {
  sm: 'size-6 rounded-[6px]',
  md: 'size-8 rounded-[8px]',
  lg: 'size-11 rounded-[10px]',
}
const GLYPH: Record<MarkSize, number> = { sm: 14, md: 18, lg: 24 }
const STROKE: Record<MarkSize, number> = { sm: 3.25, md: 3, lg: 2.75 }

export type DayState = 'done' | 'missed' | 'idle' | 'today'

export interface DayMarkProps {
  state: DayState
  size?: MarkSize
  /** Anima la entrada (se usa al confirmar un check-in). */
  animate?: boolean
  label?: string
  className?: string
}

export function DayMark({ state, size = 'md', animate = false, label, className }: DayMarkProps) {
  const shared = cn('grid place-items-center shrink-0', BOX[size], className)

  const content =
    state === 'done' ? (
      <div className={cn(shared, 'bg-success text-ink-1000 shadow-[0_6px_16px_-8px_var(--color-success)]')}>
        <Check size={GLYPH[size]} strokeWidth={STROKE[size]} absoluteStrokeWidth />
      </div>
    ) : state === 'missed' ? (
      <div className={cn(shared, 'hatch border border-danger/45 text-danger')}>
        <X size={GLYPH[size]} strokeWidth={STROKE[size]} absoluteStrokeWidth />
      </div>
    ) : state === 'today' ? (
      <div className={cn(shared, 'border-2 border-accent bg-accent-tint text-accent')}>
        <span className="size-1.5 rounded-full bg-accent" />
      </div>
    ) : (
      <div className={cn(shared, 'hatch border border-ink-700')} />
    )

  const wrapped = animate ? (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 620, damping: 26, mass: 0.6 }}
    >
      {content}
    </motion.div>
  ) : (
    content
  )

  return label ? (
    <span role="img" aria-label={label}>
      {wrapped}
    </span>
  ) : (
    wrapped
  )
}

export type StreakState = 'on' | 'risk' | 'broken'

export interface StreakBadgeProps {
  days: number
  state?: StreakState
  size?: 'sm' | 'md'
  className?: string
}

/** Píldora de racha. Es el elemento más repetido de la app: siempre igual. */
export function StreakBadge({ days, state = 'on', size = 'md', className }: StreakBadgeProps) {
  const tones: Record<StreakState, string> = {
    on: 'bg-accent-tint border-accent-line text-accent-text',
    risk: 'bg-warning-tint border-warning/40 text-warning',
    broken: 'bg-transparent border-ink-700 text-ink-400',
  }
  const glyph = size === 'sm' ? 13 : 16

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-[var(--radius-pill)]',
        size === 'sm' ? 'h-6 pl-1.5 pr-2.5' : 'h-8 pl-2.5 pr-3.5',
        tones[state],
        className,
      )}
    >
      <motion.span
        aria-hidden
        animate={state === 'on' ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={state === 'on' ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className="grid place-items-center"
      >
        <Flame size={glyph} strokeWidth={2.5} fill={state === 'broken' ? 'none' : 'currentColor'} />
      </motion.span>
      <span className={cn('num', size === 'sm' ? 'text-label' : 'text-body')}>{days}</span>
      <span className="tape opacity-70">{days === 1 ? 'día' : 'días'}</span>
    </span>
  )
}
