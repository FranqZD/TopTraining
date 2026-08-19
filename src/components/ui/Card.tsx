import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/**
 * Superficie base de Top Training.
 *
 * `tone="accent"` es la card destacada (la meta de la semana, el recap):
 * fondo teñido con el acento del tema + hairline del mismo color.
 * `notch` recorta la esquina inferior derecha en diagonal — es un detalle de
 * marca, se usa en pocas piezas por pantalla para que siga significando algo.
 */

type Tone = 'base' | 'raised' | 'accent' | 'outline'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  notch?: boolean
  interactive?: boolean
}

const TONES: Record<Tone, string> = {
  base: 'bg-surface border border-line-soft shadow-card',
  raised: 'bg-surface-raised border border-line shadow-raised',
  accent: 'bg-accent-tint border border-accent-line shadow-card',
  outline: 'bg-transparent border border-line',
}

export function Card({ tone = 'base', notch = false, interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] p-5',
        TONES[tone],
        notch && 'notch',
        interactive && 'pressable cursor-pointer hover:border-ink-600',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Label "de cinta": el sello tipográfico de la marca sobre cada bloque. */
export function CardLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('tape text-text-faint mb-2', className)}>{children}</p>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-title', className)}>{children}</h3>
}
