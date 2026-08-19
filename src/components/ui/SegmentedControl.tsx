import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Alternador de 2–3 opciones con la píldora de acento deslizándose.
 * Reemplaza cualquier tab o dropdown: un toque, sin teclado.
 */
export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('relative flex p-1 gap-1 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 min-h-[var(--size-touch)] px-3 rounded-[var(--radius-sm)] cursor-pointer',
              'text-label font-bold transition-colors duration-[var(--duration-fast)]',
              selected ? 'text-on-accent' : 'text-ink-300 hover:text-ink-100',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segmented-${label}`}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-[var(--radius-sm)] bg-accent"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
