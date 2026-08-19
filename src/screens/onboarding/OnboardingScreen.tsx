import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Moon, Sunrise, Sun } from 'lucide-react'
import { Button, ChoiceGroup, NumberStepper, ProgressBar, TextField, cn } from '../../components/ui'
import { useProfile } from '../../profile/useProfile'
import type { TrainingSlot } from '../../lib/api'
import { StepShell } from './StepShell'
import { StepFriends } from './StepFriends'
import { FREQUENCY_REACTIONS, TONE_SURFACE, TONE_TEXT } from './frequency-reactions'

const TOTAL_STEPS = 5

/**
 * Onboarding de 5 pasos. Se guarda paso a paso contra el servidor, así que
 * si el usuario cierra la app a mitad de camino no pierde lo que ya cargó;
 * al volver retoma donde estaba porque `onboardingCompleted` sigue en false.
 *
 * Solo dos pasos abren el teclado (nombre y peso). El resto es todo a dedo.
 */
export function OnboardingScreen() {
  const { profile, update } = useProfile()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [finishing, setFinishing] = useState(false)

  const [name, setName] = useState(profile?.name ?? '')
  const [slot, setSlot] = useState<TrainingSlot | null>(profile?.trainingSlot ?? null)
  const [weight, setWeight] = useState(profile?.targetWeightKg ?? 75)
  const [frequency, setFrequency] = useState<number | null>(profile?.weeklyFrequency ?? null)

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const finish = async () => {
    setFinishing(true)
    try {
      await update({ onboardingCompleted: true })
      navigate('/', { replace: true })
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <div className="mx-auto w-full max-w-[440px] px-5 py-6 flex flex-col flex-1">
        <header className="flex flex-col gap-4 pb-8">
          <div className="flex items-center justify-between h-11">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => go(step - 1)}
                aria-label="Volver al paso anterior"
                className="pressable grid place-items-center size-11 -ml-2 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <span className="size-11 -ml-2" />
            )}
            <span className="tape text-text-faint">
              Paso {step} de {TOTAL_STEPS}
            </span>
          </div>
          <ProgressBar step={step} total={TOTAL_STEPS} />
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col flex-1"
            >
              {step === 1 && (
                <StepShell
                  title="¿Cómo te van a ver tus amigos?"
                  subtitle="El nombre que aparece en el feed y en el ranking."
                  footer={
                    <Button
                      size="lg"
                      fullWidth
                      disabled={name.trim().length < 2}
                      onClick={async () => {
                        await update({ name: name.trim() })
                        go(2)
                      }}
                    >
                      Seguir
                    </Button>
                  }
                >
                  <TextField
                    label="Nombre público"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Lucas"
                    maxLength={30}
                    autoFocus
                    autoComplete="nickname"
                    hint="Después lo podés cambiar en Ajustes."
                  />
                </StepShell>
              )}

              {step === 2 && (
                <StepShell
                  title="¿Cuándo entrenás?"
                  subtitle="Para molestarte a la hora justa, no a las 7 de la mañana si sos de noche."
                  footer={
                    <Button
                      size="lg"
                      fullWidth
                      disabled={!slot}
                      onClick={async () => {
                        if (slot) await update({ trainingSlot: slot })
                        go(3)
                      }}
                    >
                      Seguir
                    </Button>
                  }
                >
                  <ChoiceGroup<TrainingSlot>
                    label="Horario de entreno"
                    columns={3}
                    value={slot}
                    onChange={setSlot}
                    options={[
                      { value: 'morning', label: 'Mañana', hint: 'antes de todo', icon: <Sunrise size={26} strokeWidth={2} /> },
                      { value: 'afternoon', label: 'Tarde', hint: 'al mediodía o después', icon: <Sun size={26} strokeWidth={2} /> },
                      { value: 'night', label: 'Noche', hint: 'saliendo del laburo', icon: <Moon size={26} strokeWidth={2} /> },
                    ]}
                    className="[&>button]:min-h-[7.5rem]"
                  />
                </StepShell>
              )}

              {step === 3 && (
                <StepShell
                  title="¿A qué peso querés llegar?"
                  subtitle="Un número concreto. Sin “estar mejor”."
                  footer={
                    <Button
                      size="lg"
                      fullWidth
                      onClick={async () => {
                        await update({ targetWeightKg: weight })
                        go(4)
                      }}
                    >
                      Seguir
                    </Button>
                  }
                >
                  <div className="py-6">
                    <NumberStepper
                      id="targetWeight"
                      label="Peso objetivo"
                      value={weight}
                      onChange={setWeight}
                      min={35}
                      max={250}
                      step={0.5}
                      unit="kg"
                    />
                  </div>
                  <p className="text-caption text-text-faint text-center">
                    Tocá los botones o escribilo. Se ajusta de a medio kilo.
                  </p>
                </StepShell>
              )}

              {step === 4 && <StepFrequency value={frequency} onSelect={setFrequency} onAdvance={() => go(5)} onSave={(value) => update({ weeklyFrequency: value })} />}

              {step === 5 && (
                <StepFriends friendCode={profile?.friendCode ?? ''} onFinish={finish} finishing={finishing} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* --- Paso 4: frecuencia con reacción escalada ---------------------------- */

function StepFrequency({
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
  const reaction = value ? FREQUENCY_REACTIONS[value] : null

  const choose = async (next: number) => {
    onSelect(next)
    await onSave(next)
    // Damos tiempo a leer la reacción antes de pasar de pantalla.
    setTimeout(onAdvance, 1100)
  }

  return (
    <StepShell
      title="¿Cuántas veces entrenás por semana?"
      subtitle="Hoy, de verdad. No la versión de tu cabeza."
    >
      <ChoiceGroup
        label="Frecuencia semanal actual"
        columns={4}
        value={value}
        onChange={choose}
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
