import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/**
 * Botón de Top Training.
 *
 * - Alto mínimo 44px (`md` = 52px, `lg` = 60px) porque todo se usa con el pulgar.
 * - El primario es un bloque sólido de acento con texto casi negro: la firma de
 *   la marca. Cambia solo con el tema del usuario, sin tocar este archivo.
 * - Sin gradientes decorativos. El único brillo es la sombra proyectada del
 *   acento, que da la sensación de luz de neón sobre carbón.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  /** Icono a la izquierda del texto (lucide-react, 20px). */
  icon?: ReactNode
  /** Icono a la derecha — para "siguiente", "ver más". */
  iconEnd?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: cn(
    'bg-accent text-on-accent border border-transparent shadow-accent-sm',
    'hover:bg-accent-strong hover:shadow-accent',
    'disabled:bg-ink-700 disabled:text-ink-400 disabled:shadow-none',
  ),
  secondary: cn(
    'bg-ink-850 text-ink-50 border border-ink-700',
    'hover:bg-ink-800 hover:border-ink-600',
    'disabled:text-ink-500 disabled:border-ink-800',
  ),
  ghost: cn(
    'bg-transparent text-ink-200 border border-transparent',
    'hover:bg-ink-850 hover:text-ink-50',
    'disabled:text-ink-500',
  ),
  danger: cn(
    'bg-danger-tint text-danger border border-danger/40',
    'hover:bg-danger hover:text-ink-50 hover:border-danger',
  ),
}

const SIZES: Record<Size, string> = {
  sm: 'h-[var(--size-touch)] px-4 text-label rounded-[var(--radius-sm)] gap-1.5',
  md: 'h-[var(--size-control)] px-6 text-body rounded-[var(--radius-md)] gap-2',
  lg: 'h-[var(--size-control-lg)] px-8 text-lead rounded-[var(--radius-md)] gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconEnd,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'pressable inline-flex items-center justify-center select-none',
        'font-bold tracking-tighter [font-variation-settings:"wdth"_104]',
        'disabled:pointer-events-none disabled:opacity-70',
        SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {iconEnd}
    </button>
  )
}
