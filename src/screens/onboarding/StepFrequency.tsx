import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, ChoiceGroup, cn } from '../../components/ui'
import { StepShell } from './StepShell'
import { FREQUENCY_REACTIONS, TONE_SURFACE, TONE_TEXT } from './frequency-reactions'

/**
 * Paso 4 — frecuencia semanal, con la reacción que escala de tono.
 *
 * Tocar un número solo muestra la reacción: para avanzar hay que confirmar.
 * Así se pueden probar varios y leer qué dice la app de cada uno antes de
 * comprometerse, en vez de quedar encerrado con el primero que se tocó.
 */
export function StepFrequency({
  value,
  onSelect,
  onAdvance,
  onSave,
}: {
  value: number | null
  onSelect: (value: number) => void
  onAdvance: () => void
  onSave: (value: number) => Promise<unknown>
}) {
  const [saving, setSaving] = useState(false)
  const reaction = value ? FREQUENCY_REACTIONS[value] : null

  /**
   * Tocar un número solo muestra la reacción; se avanza con el botón.
   * Así el usuario puede probar varios y leer qué le dice la app de cada uno
   * antes de comprometerse, en vez de quedar encerrado con el primero que tocó.
   */
  const confirm = async () => {
    if (!value) return
    setSaving(true)
    try {
      await onSave(value)
      onAdvance()
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepShell
      title="¿Cuántas veces entrenas por semana?"
      subtitle="Hoy, de verdad. No la versión de tu cabeza."
      footer={
        <Button size="lg" fullWidth disabled={!value || saving} onClick={confirm}>
          Confirmar
        </Button>
      }
    >
      <ChoiceGroup
        label="Frecuencia semanal actual"
        columns={4}
        value={value}
        onChange={onSelect}
        options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: <span className="num text-title">{n}</span> }))}
      />

      <div className="min-h-[7.5rem]">
        <AnimatePresence mode="wait">
          {reaction && (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 480, damping: 26 }}
              className={cn(
                'rounded-[var(--radius-lg)] border p-4 text-center',
                TONE_SURFACE[reaction.tone],
                reaction.highlight && 'notch',
              )}
            >
              <p className={cn('text-title', TONE_TEXT[reaction.tone])}>{reaction.text}</p>
              <p className="text-caption text-text-muted mt-1">{reaction.sub}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  )
}
