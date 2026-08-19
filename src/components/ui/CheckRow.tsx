import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Fila seleccionable de una lista múltiple (por ejemplo: a qué amigos meto
 * en el grupo). Toda la fila es el área táctil — no hay un checkbox chiquito
 * que haya que apuntar con el dedo.
 */
export function CheckRow({
  checked,
  onToggle,
  leading,
  title,
  subtitle,
  className,
}: {
  checked: boolean
  onToggle: () => void
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'flex items-center gap-3 w-full min-h-[var(--size-control-lg)] px-3.5 py-2.5 text-left cursor-pointer',
        'rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)]',
        checked ? 'bg-accent-tint border-accent' : 'bg-ink-900 border-ink-700 hover:bg-ink-850 hover:border-ink-600',
        className,
      )}
    >
      {leading}
      <span className="flex-1 min-w-0">
        <span className="block font-bold truncate leading-tight">{title}</span>
        {subtitle && <span className="block text-caption text-text-faint truncate">{subtitle}</span>}
      </span>
      <span
        className={cn(
          'grid place-items-center size-6 shrink-0 rounded-[var(--radius-xs)] border',
          checked ? 'bg-accent border-accent text-on-accent' : 'border-ink-600 text-transparent',
        )}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className="grid place-items-center"
          >
            <Check size={14} strokeWidth={3.5} absoluteStrokeWidth />
          </motion.span>
        )}
      </span>
    </motion.button>
  )
}
