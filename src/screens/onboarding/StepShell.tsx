import type { ReactNode } from 'react'

/** Encabezado común de cada paso: pregunta grande + bajada con actitud. */
export function StepShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline">{title}</h1>
        {subtitle && <p className="text-body text-text-muted">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-5 flex-1">{children}</div>
      {footer && <div className="flex flex-col gap-3 pt-2">{footer}</div>}
    </div>
  )
}
