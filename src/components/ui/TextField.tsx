import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/**
 * Campo de texto. En Top Training el teclado es la excepción, así que este
 * componente aparece poco: nombre, email, contraseña, peso, código de amigo
 * y búsqueda. Nada más.
 */
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: ReactNode
  error?: string | null
  /** Icono decorativo a la izquierda. */
  icon?: ReactNode
  suffix?: ReactNode
}

export function TextField({ label, hint, error, icon, suffix, className, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="tape text-text-faint">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2.5 h-[var(--size-control)] px-4 rounded-[var(--radius-md)]',
          'bg-ink-850 border transition-colors duration-[var(--duration-fast)]',
          'focus-within:border-accent',
          error ? 'border-danger' : 'border-ink-700',
        )}
      >
        {icon && <span className="text-ink-400 shrink-0">{icon}</span>}
        <input
          id={inputId}
          className={cn(
            'flex-1 min-w-0 bg-transparent outline-none placeholder:text-ink-500',
            'text-body', // 16px: evita que iOS haga zoom al enfocar
            className,
          )}
          {...props}
        />
        {suffix && <span className="text-text-faint shrink-0 tape">{suffix}</span>}
      </div>
      {error ? (
        <p className="text-caption text-danger">{error}</p>
      ) : (
        hint && <p className="text-caption text-text-faint">{hint}</p>
      )}
    </div>
  )
}
