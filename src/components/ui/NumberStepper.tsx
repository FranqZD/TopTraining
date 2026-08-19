import { Minus, Plus } from 'lucide-react'
import { cn } from './cn'

/**
 * Número grande con −/+ a los costados. El input sigue existiendo para
 * escribir el valor de una, pero el 90% de los ajustes se hacen a dedo.
 */
export interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  label?: string
  id?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 30,
  max = 250,
  step = 0.5,
  unit = 'kg',
  label,
  id = 'number-stepper',
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 2) / 2))
  const bump = (delta: number) => onChange(clamp(value + delta))

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="tape text-text-faint">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <StepButton onClick={() => bump(-step)} disabled={value <= min} aria-label={`Restar ${step} ${unit}`}>
          <Minus size={22} strokeWidth={3} />
        </StepButton>

        <div className="flex-1 flex items-baseline justify-center gap-1.5 min-w-0">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value.replace(',', '.'))
              if (!Number.isNaN(parsed)) onChange(parsed)
            }}
            onBlur={() => onChange(clamp(value))}
            className="num text-stat bg-transparent outline-none text-accent text-center w-full max-w-[5ch]"
            aria-label={label}
          />
          <span className="tape text-text-faint">{unit}</span>
        </div>

        <StepButton onClick={() => bump(step)} disabled={value >= max} aria-label={`Sumar ${step} ${unit}`}>
          <Plus size={22} strokeWidth={3} />
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'pressable grid place-items-center size-14 shrink-0 cursor-pointer',
        'rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-100',
        'hover:bg-ink-800 hover:border-ink-600 disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  )
}
