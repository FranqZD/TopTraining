import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * PRINCIPIO DE UX DE TOP TRAINING: el teclado es el último recurso.
 * Cualquier decisión con opciones acotadas (frecuencia semanal, tipo de
 * entreno, quién invita, días de descanso) se resuelve con este componente,
 * no con un input de texto.
 *
 * Cada opción es un bloque de 60px+ pensado para el pulgar, y la selección
 * responde con un micro-rebote — la app tiene que sentirse viva al tocarla.
 */

export interface ChoiceOption<T extends string | number> {
  value: T
  label: ReactNode
  /** Línea chica debajo del label: "3 veces por semana", "para arrancar". */
  hint?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface ChoiceGroupProps<T extends string | number> {
  options: ChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  /** Columnas de la grilla. 1 = lista apilada. */
  columns?: 1 | 2 | 3 | 4
  /** Etiqueta accesible del grupo. */
  label: string
  className?: string
}

export function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  columns = 3,
  label,
  className,
}: ChoiceGroupProps<T>) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns]

  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2.5', cols, className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.96 }}
            animate={selected ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            className={cn(
              'min-h-[var(--size-control-lg)] px-3 py-3 rounded-[var(--radius-md)] border text-center',
              'flex flex-col items-center justify-center gap-1 cursor-pointer',
              'transition-colors duration-[var(--duration-fast)] disabled:opacity-40 disabled:cursor-not-allowed',
              selected
                ? 'bg-accent-tint border-accent text-ink-50'
                : 'bg-ink-850 border-ink-700 text-ink-200 hover:border-ink-600 hover:bg-ink-800',
            )}
          >
            {option.icon}
            <span className={cn('font-bold leading-none', selected && 'text-accent-text')}>{option.label}</span>
            {option.hint && <span className="text-micro text-text-faint leading-tight">{option.hint}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
