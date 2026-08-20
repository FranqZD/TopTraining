import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Hoja inferior. En una app que se usa con una mano, un modal centrado deja el
 * contenido lejos del pulgar: esta entra desde abajo y el botón de cerrar
 * queda al alcance.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  // Con la hoja abierta el fondo no se scrollea.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink-1000/80 backdrop-blur-sm cursor-default"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className={cn(
              'relative w-full max-w-[440px] max-h-[88dvh] flex flex-col',
              'rounded-t-[var(--radius-xl)] bg-surface-raised border-t border-x border-line shadow-sheet',
              className,
            )}
          >
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 shrink-0">
              <span className="absolute left-1/2 -translate-x-1/2 top-2 h-1 w-10 rounded-full bg-ink-700" />
              <div className="flex-1 min-w-0 pt-2">{title}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="pressable grid place-items-center size-11 shrink-0 -mr-2 rounded-[var(--radius-md)] text-ink-400 hover:text-ink-50 hover:bg-ink-800 cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
