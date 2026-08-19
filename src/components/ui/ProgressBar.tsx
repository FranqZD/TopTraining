import { motion } from 'motion/react'
import { cn } from './cn'

/** Barra de progreso del onboarding: un segmento por paso. */
export function ProgressBar({
  step,
  total,
  className,
}: {
  step: number
  total: number
  className?: string
}) {
  return (
    <div
      className={cn('flex gap-1.5', className)}
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Paso ${step} de ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className="h-1 flex-1 rounded-full bg-ink-800 overflow-hidden">
          <motion.span
            className="block h-full rounded-full bg-accent origin-left"
            initial={false}
            animate={{ scaleX: index < step ? 1 : 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          />
        </span>
      ))}
    </div>
  )
}
