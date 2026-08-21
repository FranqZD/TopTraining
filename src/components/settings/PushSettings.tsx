import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Bell, BellOff, Flame, Loader2, MessageCircle, Share, SquarePlus, UserPlus, Users } from 'lucide-react'
import { Button, Card, CardLabel, Switch } from '../ui'
import { api, type AppConfig, type NotifyKey, type TrainingSlot } from '../../lib/api'
import { disablePush, enablePush, getPushState, isIOS, type PushState } from '../../lib/push'
import { useProfile } from '../../profile/useProfile'

/**
 * Los avisos: activarlos en este dispositivo y elegir cuáles.
 *
 * El orden importa: NUNCA pedimos permiso al abrir la app. En iOS el push solo
 * existe con la PWA instalada, así que si detectamos ese caso mostramos cómo
 * instalarla y recién ahí ofrecemos activar. El permiso se pide una sola vez
 * en la vida del sitio: hay que gastarlo cuando el usuario ya sabe qué gana.
 *
 * Los interruptores de abajo son del usuario, no del dispositivo: viven en el
 * perfil, así que apagar "aura y laura" en el teléfono también lo apaga en la
 * tablet. Solo aparecen con los avisos activados — elegir cuáles recibir
 * cuando no se recibe ninguno no significa nada.
 */

/** A qué hora llega el recordatorio según el horario elegido en el onboarding. */
const NUDGE_LABEL: Record<TrainingSlot, string> = {
  morning: 'a las 10:00',
  afternoon: 'a las 17:00',
  night: 'a las 20:30',
}

export function PushSettings({ trainingSlot }: { trainingSlot: TrainingSlot | null }) {
  const [state, setState] = useState<PushState | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const refresh = useCallback(async () => setState(await getPushState()), [])

  useEffect(() => {
    void refresh()
    api.get<AppConfig>('/config').then(setConfig).catch(() => setConfig(null))
  }, [refresh])

  const toggle = async () => {
    if (!config?.vapidPublicKey) return
    setBusy(true)
    setFeedback(null)
    try {
      setState(state === 'on' ? await disablePush() : await enablePush(config.vapidPublicKey))
    } catch {
      setFeedback('No pudimos activarlos. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      const { delivered } = await api.post<{ delivered: number }>('/push/test')
      setFeedback(delivered > 0 ? 'Enviado. Revisa la notificación.' : 'No llegó a ningún dispositivo.')
    } catch {
      setFeedback('No pudimos mandar la prueba.')
    } finally {
      setBusy(false)
    }
  }

  if (state === null) return null

  // El servidor no tiene claves VAPID: no hay nada que ofrecer.
  if (config && !config.push) {
    return (
      <Section>
        <Card tone="outline">
          <p className="text-caption text-text-muted">
            Los recordatorios no están configurados en este servidor.
          </p>
        </Card>
      </Section>
    )
  }

  if (state === 'needs-install') return <Section><InstallInstructions /></Section>

  if (state === 'unsupported') {
    return (
      <Section>
        <Card tone="outline">
          <p className="text-caption text-text-muted">
            Este navegador no soporta recordatorios. Prueba desde Chrome, Edge o Safari con la app instalada.
          </p>
        </Card>
      </Section>
    )
  }

  if (state === 'denied') {
    return (
      <Section>
        <Card tone="outline" className="flex items-start gap-3">
          <BellOff size={20} strokeWidth={2.5} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-body text-ink-100">Bloqueaste las notificaciones.</p>
            <p className="text-caption text-text-faint mt-1">
              Para volver atrás hay que habilitarlas en los ajustes del navegador para este sitio.
            </p>
          </div>
        </Card>
      </Section>
    )
  }

  const on = state === 'on'

  return (
    <Section>
      <motion.div layout>
        <Card tone={on ? 'accent' : 'base'} notch={on} className="flex items-center gap-3.5">
          <span
            className={`grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] ${
              on ? 'bg-accent text-on-accent' : 'bg-ink-850 border border-ink-700 text-ink-400'
            }`}
          >
            {on ? <Bell size={20} strokeWidth={2.5} /> : <BellOff size={20} strokeWidth={2.5} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">{on ? 'Avisos activados' : 'Avisos apagados'}</p>
            <p className="text-caption text-text-muted">
              {on
                ? 'En este dispositivo. Elige abajo cuáles quieres recibir.'
                : 'El recordatorio de entrenar y lo que pase en tus grupos.'}
            </p>
          </div>
        </Card>
      </motion.div>

      <div className="flex gap-2">
        <Button
          variant={on ? 'secondary' : 'primary'}
          fullWidth
          onClick={toggle}
          disabled={busy}
          icon={busy ? <Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> : undefined}
        >
          {on ? 'Desactivar' : 'Activar avisos'}
        </Button>
        {on && (
          <Button variant="ghost" onClick={sendTest} disabled={busy}>
            Probar
          </Button>
        )}
      </div>

      {feedback && <p className="text-caption text-text-muted">{feedback}</p>}

      {on && <NotifySwitches trainingSlot={trainingSlot} />}
    </Section>
  )
}

/** Qué avisos quiero. Cada interruptor guarda solo, sin botón de guardar. */
function NotifySwitches({ trainingSlot }: { trainingSlot: TrainingSlot | null }) {
  const { profile, update } = useProfile()
  // Mientras el servidor responde mandamos el interruptor donde el dedo lo
  // dejó: esperar el ida y vuelta para moverlo se siente roto.
  const [pending, setPending] = useState<Partial<Record<NotifyKey, boolean>>>({})

  if (!profile) return null

  const toggle = async (key: NotifyKey) => {
    const next = !(pending[key] ?? profile[key])
    setPending((current) => ({ ...current, [key]: next }))
    try {
      await update({ [key]: next })
    } catch {
      /* si falla, al soltar el pendiente vuelve solo a lo que dice el perfil */
    } finally {
      setPending(({ [key]: _ignored, ...rest }) => rest)
    }
  }

  const rows: { key: NotifyKey; icon: React.ReactNode; title: string; subtitle: string }[] = [
    {
      key: 'notifyNudge',
      icon: <Bell size={18} strokeWidth={2.5} />,
      title: 'Recordatorio de entreno',
      subtitle: trainingSlot
        ? `Si no marcaste, ${NUDGE_LABEL[trainingSlot]}. Una vez por día.`
        : 'Elige tu horario de entreno arriba para saber cuándo avisarte.',
    },
    {
      key: 'notifyPosts',
      icon: <Users size={18} strokeWidth={2.5} />,
      title: 'Entrenos de tus grupos',
      subtitle: 'Cuando alguien de tus grupos marca el suyo.',
    },
    {
      key: 'notifyComments',
      icon: <MessageCircle size={18} strokeWidth={2.5} />,
      title: 'Comentarios',
      subtitle: 'Cuando comentan tu entreno.',
    },
    {
      key: 'notifyVotes',
      icon: <Flame size={18} strokeWidth={2.5} />,
      title: 'Aura y laura',
      subtitle: 'Cuando votan tu entreno.',
    },
    {
      key: 'notifyFriends',
      icon: <UserPlus size={18} strokeWidth={2.5} />,
      title: 'Solicitudes de amistad',
      subtitle: 'Cuando alguien te quiere agregar.',
    },
  ]

  return (
    <div className="flex flex-col gap-2 pt-1">
      {rows.map((row) => {
        const checked = pending[row.key] ?? profile[row.key]
        return (
          <Switch
            key={row.key}
            checked={checked}
            onChange={() => void toggle(row.key)}
            title={row.title}
            subtitle={row.subtitle}
            leading={
              <span
                className={`grid place-items-center size-9 shrink-0 rounded-[var(--radius-sm)] ${
                  checked ? 'bg-ink-800 text-ink-100' : 'bg-ink-850 text-ink-500'
                }`}
              >
                {row.icon}
              </span>
            }
          />
        )
      })}
    </div>
  )
}

/**
 * Instrucciones de instalación para iOS. No hay API para instalar desde
 * código en Safari, así que lo único honesto es explicar los dos toques.
 */
function InstallInstructions() {
  const ios = isIOS()

  return (
    <Card tone="accent" notch className="flex flex-col gap-3">
      <p className="text-title leading-tight">Primero instala la app</p>
      <p className="text-caption text-text-muted">
        {ios
          ? 'En iPhone y iPad los avisos solo funcionan con Top Training agregada a la pantalla de inicio. Son dos toques:'
          : 'Agrega Top Training a tu pantalla de inicio para recibir los avisos:'}
      </p>

      <ol className="flex flex-col gap-2.5">
        <Step number={1} icon={<Share size={18} strokeWidth={2.5} />}>
          Toca <span className="text-ink-50 font-bold">Compartir</span> en la barra de Safari.
        </Step>
        <Step number={2} icon={<SquarePlus size={18} strokeWidth={2.5} />}>
          Elige <span className="text-ink-50 font-bold">Agregar a inicio</span>.
        </Step>
        <Step number={3}>
          Abre Top Training desde el ícono nuevo y regresa aquí para activarlos.
        </Step>
      </ol>
    </Card>
  )
}

function Step({ number, icon, children }: { number: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid place-items-center size-8 shrink-0 rounded-[var(--radius-sm)] bg-ink-1000/40 border border-accent-line text-accent">
        {icon ?? <span className="num text-label">{number}</span>}
      </span>
      <span className="text-caption text-ink-200">{children}</span>
    </li>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <CardLabel className="mb-0">Notificaciones</CardLabel>
      {children}
    </section>
  )
}
