import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Interruptor de encendido/apagado (qué avisos quiero recibir).
 *
 * Como en `CheckRow`, el área táctil es la fila entera: la perilla es de 48px
 * y apuntarle con el pulgar en un teléfono es pedirle demasiado a la gente.
 *
 * `CheckRow` es para elegir de una lista; esto es para prender y apagar algo
 * que ya existe. Por eso no se pinta de acento al estar encendido: son cinco
 * en pantalla y el acento se usa poco.
 */
export function Switch({
  checked,
  onChange,
  title,
  subtitle,
  leading,
  disabled = false,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className={cn(
        'flex items-center gap-3 w-full min-h-[var(--size-control)] px-3.5 py-2.5 text-left',
        'rounded-[var(--radius-md)] border bg-ink-900 border-ink-700',
        'transition-colors duration-[var(--duration-fast)]',
        disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-ink-850 hover:border-ink-600',
        className,
      )}
    >
      {leading}
      <span className="flex-1 min-w-0">
        <span className="block font-bold truncate leading-tight">{title}</span>
        {subtitle && <span className="block text-caption text-text-faint">{subtitle}</span>}
      </span>

      <span
        aria-hidden
        className={cn(
          'flex items-center shrink-0 w-12 h-7 p-0.5 rounded-full border',
          'transition-colors duration-[var(--duration-fast)]',
          checked ? 'bg-accent border-accent justify-end' : 'bg-ink-850 border-ink-600 justify-start',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 26 }}
          className={cn('block size-5 rounded-full', checked ? 'bg-on-accent' : 'bg-ink-400')}
        />
      </span>
    </motion.button>
  )
}
