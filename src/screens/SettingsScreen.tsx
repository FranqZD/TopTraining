import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, Check, KeyRound, LogOut, Moon, Sunrise, Sun } from 'lucide-react'
import {
  Button,
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
import { api, ApiError } from '../lib/api'
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

        {/* --- Tema --- */}
        <Section label="Paleta de la app">
          <p className="text-caption text-text-muted -mt-1">Se aplica al instante, en toda la app.</p>
          <ThemePicker />
        </Section>

        {/* --- Contraseña --- */}
        <PasswordSection />

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

/**
 * Cambiar la contraseña. Va al fondo de Ajustes porque casi nunca se toca.
 *
 * Solo la nueva y su confirmación: la sesión abierta en este teléfono ya es
 * la prueba de identidad, y pedir la vieja acá no protege de nada que no
 * proteja tener el teléfono desbloqueado.
 */
function PasswordSection() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setDone(false)

    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las dos contraseñas no son iguales.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      await api.post('/me/password', { password })
      setPassword('')
      setConfirm('')
      setDone(true)
      setTimeout(() => setDone(false), 2400)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo cambiar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section label="Cambiar contraseña" saved={done}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          name="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Nueva contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<KeyRound size={18} strokeWidth={2.5} />}
          hint="Mínimo 8 caracteres."
        />
        <TextField
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          icon={<KeyRound size={18} strokeWidth={2.5} />}
          error={error}
        />
        <Button type="submit" fullWidth disabled={busy || password.length === 0 || confirm.length === 0}>
          {busy ? 'Guardando…' : 'Aceptar'}
        </Button>
      </form>
    </Section>
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
