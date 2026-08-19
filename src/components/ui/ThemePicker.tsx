import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { PALETTES } from '../../theme/palettes'
import { useTheme } from '../../theme/useTheme'
import { cn } from './cn'

/**
 * Selector de paleta — se usa en Ajustes y como último paso del onboarding.
 * Un toque aplica el tema al instante en toda la app (repinta las variables
 * CSS en <html>) y lo persiste. Sin guardar, sin confirmar, sin teclado.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div role="radiogroup" aria-label="Paleta de la app" className={cn('flex flex-col gap-2', className)}>
      {PALETTES.map((palette) => {
        const selected = palette.id === theme
        return (
          <motion.button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(palette.id)}
            whileTap={{ scale: 0.985 }}
            className={cn(
              'flex items-center gap-3.5 min-h-[var(--size-control-lg)] px-3.5 py-3 text-left cursor-pointer',
              'rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)]',
              selected ? 'bg-ink-850 border-accent' : 'bg-ink-900 border-ink-700 hover:bg-ink-850 hover:border-ink-600',
            )}
          >
            {/* Muestra: acento grande + los tres colores de estado.
                Usa hex del catálogo porque muestra las 5 paletas a la vez. */}
            <span className="flex items-center gap-1 shrink-0">
              <span
                className="size-9 rounded-[var(--radius-xs)]"
                style={{ backgroundColor: palette.swatch.accent }}
                aria-hidden
              />
              <span className="flex flex-col gap-1" aria-hidden>
                {[palette.swatch.success, palette.swatch.warning, palette.swatch.danger].map((c) => (
                  <span key={c} className="block size-[9px] rounded-[3px]" style={{ backgroundColor: c }} />
                ))}
              </span>
            </span>

            <span className="flex-1 min-w-0">
              <span className="block font-bold leading-tight">{palette.name}</span>
              <span className="block text-caption text-text-faint truncate">{palette.tagline}</span>
            </span>

            <span
              className={cn(
                'grid place-items-center size-6 rounded-full border shrink-0',
                selected ? 'bg-accent border-accent text-on-accent' : 'border-ink-600 text-transparent',
              )}
            >
              {selected && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                  className="grid place-items-center"
                >
                  <Check size={14} strokeWidth={3.5} absoluteStrokeWidth />
                </motion.span>
              )}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
