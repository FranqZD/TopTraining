import { Flame } from 'lucide-react'
import type { Streaks } from '../../lib/api'
import { cn } from './cn'

/**
 * La racha de un vistazo, en una línea.
 *
 * Prioridad: cuántos entrenos lleva en la racha (los descansos no la cortan
 * si cumplió la meta de la semana). Si no hay días, cuántas semanas viene
 * cumpliendo. Y si no hay nada, se dice sin vueltas: la racha está rota.
 */
export function StreakLabel({ streaks, className }: { streaks: Streaks; className?: string }) {
  if (streaks.daily > 0) {
    return (
      <span className={cn('flex items-center gap-1.5 text-accent-text', className)}>
        <Flame size={15} strokeWidth={2.5} fill="currentColor" className="shrink-0" />
        <span className="text-caption font-bold">
          <span className="num">{streaks.daily}</span> {streaks.daily === 1 ? 'día' : 'días'} cumpliendo
        </span>
      </span>
    )
  }

  if (streaks.weekly > 0) {
    return (
      <span className={cn('flex items-center gap-1.5 text-success', className)}>
        <Flame size={15} strokeWidth={2.5} className="shrink-0" />
        <span className="text-caption font-bold">
          <span className="num">{streaks.weekly}</span> {streaks.weekly === 1 ? 'semana' : 'semanas'} cumpliendo
        </span>
      </span>
    )
  }

  return (
    <span className={cn('flex items-center gap-1.5 text-ink-400', className)}>
      <Flame size={15} strokeWidth={2.5} className="shrink-0 opacity-60" />
      <span className="text-caption font-bold">Racha rota</span>
    </span>
  )
}
