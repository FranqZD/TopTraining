import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, Check, Copy, LogOut, Moon, Sunrise, Sun } from 'lucide-react'
import {
  Button,
  Card,
  CardLabel,
  ChoiceGroup,
  NumberStepper,
  TextField,
  ThemePicker,
  cn,
} from '../components/ui'
import { PushSettings } from '../components/settings/PushSettings'
import { useProfile } from '../profile/useProfile'
import { signOut } from '../lib/auth-client'
import type { Profile, TrainingSlot } from '../lib/api'
import { FREQUENCY_REACTIONS, TONE_TEXT } from './onboarding/frequency-reactions'

/**
 * Ajustes. Todo lo que se pidió en el onboarding se puede editar acá.
 * Nada de botón "Guardar": cada control persiste al tocarlo (el texto y el
 * peso, con un respiro para no disparar una request por tecla).
 */
export function SettingsScreen() {
  const { profile } = useProfile()
  if (!profile) return null
  // El formulario se monta recién con el perfil cargado, así que su estado
  // inicial ya es el bueno y no hace falta sincronizarlo con un effect.
  return <SettingsForm key={profile.id} profile={profile} />
}

function SettingsForm({ profile }: { profile: Profile }) {
  const { update } = useProfile()
  const navigate = useNavigate()
  const [saved, setSaved] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [name, setName] = useState(profile.name)
  const [weight, setWeight] = useState(profile.targetWeightKg ?? 75)

  const flash = (field: string) => {
    setSaved(field)
    setTimeout(() => setSaved((current) => (current === field ? null : current)), 1600)
  }

  const save = async (patch: Parameters<typeof update>[0], field: string) => {
    await update(patch)
    flash(field)
  }

  // El peso se guarda cuando el usuario deja de tocarlo.
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const changeWeight = (next: number) => {
    setWeight(next)
    if (weightTimer.current) clearTimeout(weightTimer.current)
    weightTimer.current = setTimeout(() => void save({ targetWeightKg: next }, 'weight'), 600)
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.friendCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin portapapeles: el código está a la vista igual */
    }
  }

  const reaction = profile.weeklyFrequency ? FREQUENCY_REACTIONS[profile.weeklyFrequency] : null

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-8">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-headline">Ajustes</h1>
        </header>

        {/* --- Perfil --- */}
        <Section label="Tu perfil" saved={saved === 'name'}>
          <TextField
            label="Nombre público"
            name="name"
            value={name}
            maxLength={30}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              const trimmed = name.trim()
              if (trimmed.length >= 2 && trimmed !== profile.name) void save({ name: trimmed }, 'name')
              else setName(profile.name)
            }}
          />
        </Section>

        {/* --- Horario --- */}
        <Section label="Horario de entreno" saved={saved === 'slot'}>
          <ChoiceGroup<TrainingSlot>
            label="Horario de entreno"
            columns={3}
            value={profile.trainingSlot}
            onChange={(slot) => void save({ trainingSlot: slot }, 'slot')}
            options={[
              { value: 'morning', label: 'Mañana', icon: <Sunrise size={24} strokeWidth={2} /> },
              { value: 'afternoon', label: 'Tarde', icon: <Sun size={24} strokeWidth={2} /> },
              { value: 'night', label: 'Noche', icon: <Moon size={24} strokeWidth={2} /> },
            ]}
          />
        </Section>

        {/* --- Peso objetivo --- */}
        <Section label="Peso objetivo" saved={saved === 'weight'}>
          <NumberStepper id="weight" value={weight} onChange={changeWeight} min={35} max={250} step={0.5} unit="kg" />
        </Section>

        {/* --- Frecuencia --- */}
        <Section label="Entrenos por semana" saved={saved === 'frequency'}>
          <ChoiceGroup
            label="Frecuencia semanal"
            columns={4}
            value={profile.weeklyFrequency}
            onChange={(value) => void save({ weeklyFrequency: value }, 'frequency')}
            options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: <span className="num text-title">{n}</span> }))}
          />
          {reaction && <p className={cn('text-caption', TONE_TEXT[reaction.tone])}>{reaction.text}.</p>}
        </Section>

        {/* --- Avisos: la hora del recordatorio sale del horario de arriba --- */}
        <PushSettings trainingSlot={profile.trainingSlot} />

        {/* --- Código de amistad --- */}
        <Section label="Tu código de amigo">
          <Card tone="accent" notch>
            <div className="flex items-center justify-between gap-3">
              <span className="num text-stat text-accent tracking-[0.08em]">{profile.friendCode}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={copyCode}
                icon={copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-caption text-text-muted mt-2">Es fijo y no se puede cambiar. Compártelo con quien quieras.</p>
          </Card>
        </Section>

        {/* --- Tema --- */}
        <Section label="Paleta de la app">
          <p className="text-caption text-text-muted -mt-1">Se aplica al instante, en toda la app.</p>
          <ThemePicker />
        </Section>

        <div className="pt-2 pb-10">
          <Button
            variant="danger"
            fullWidth
            icon={<LogOut size={18} strokeWidth={2.5} />}
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({
  label,
  saved,
  children,
}: {
  label: string
  saved?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CardLabel className="mb-0">{label}</CardLabel>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="tape text-success flex items-center gap-1"
          >
            <Check size={12} strokeWidth={4} absoluteStrokeWidth /> guardado
          </motion.span>
        )}
      </div>
      {children}
    </section>
  )
}
