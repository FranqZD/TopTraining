import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Clock } from 'lucide-react'
import { Avatar, Button, CardLabel, DayMark, cn } from '../../components/ui'
import { AddFriendPanel } from '../../components/friends/AddFriendPanel'
import { api, localDay, type Friend } from '../../lib/api'
import { StepShell } from './StepShell'

interface Sent {
  friend: Friend
  status: string
}

/**
 * Paso 4 — amigos + primer check-in opcional.
 * Agregar manda una solicitud: recién son amigos cuando el otro acepta, así
 * que acá mostramos el estado real y no una lista de amigos que no lo son.
 */
export function StepFriends({
  friendCode,
  onFinish,
  finishing,
}: {
  friendCode: string
  onFinish: () => void
  finishing: boolean
}) {
  const [sent, setSent] = useState<Sent[]>([])
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)

  const checkInToday = async () => {
    setCheckingIn(true)
    try {
      await api.post('/checkins', { day: localDay() })
      setCheckedIn(true)
    } catch {
      // El check-in es opcional: si falla no bloqueamos el onboarding.
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <StepShell
      title="Trae a tus amigos"
      subtitle="Solo no funciona. Con testigos, sí."
      footer={
        <>
          {/* Primer check-in: sin foto ni descripción, un solo toque. */}
          <button
            type="button"
            onClick={checkedIn ? undefined : checkInToday}
            disabled={checkingIn}
            className={cn(
              'pressable w-full flex items-center gap-4 p-4 text-left cursor-pointer',
              'rounded-[var(--radius-lg)] border transition-colors duration-[var(--duration-fast)]',
              checkedIn
                ? 'bg-success-tint border-success/45 cursor-default'
                : 'bg-ink-850 border-ink-700 hover:border-accent hover:bg-ink-800',
            )}
          >
            <DayMark key={String(checkedIn)} state={checkedIn ? 'done' : 'today'} size="lg" animate={checkedIn} />
            <span className="flex-1 min-w-0">
              <span className="block font-bold leading-tight">
                {checkedIn ? 'Anotado. Empezaste con el pie derecho.' : 'Marcar que entrené hoy'}
              </span>
              <span className="block text-caption text-text-faint">
                {checkedIn ? 'Ya suma a tu racha.' : 'Opcional — puedes empezar mañana.'}
              </span>
            </span>
          </button>

          <Button size="lg" fullWidth onClick={onFinish} disabled={finishing}>
            {sent.length > 0 ? 'Listo, entrar' : 'Después agrego amigos'}
          </Button>
        </>
      }
    >
      <AddFriendPanel
        myCode={friendCode}
        onRequestSent={(friend, status) =>
          setSent((current) =>
            current.some((item) => item.friend.id === friend.id) ? current : [...current, { friend, status }],
          )
        }
      />

      {sent.length > 0 && (
        <div className="flex flex-col gap-2">
          <CardLabel>Ya les escribiste ({sent.length})</CardLabel>
          {sent.map(({ friend, status }) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700"
            >
              <Avatar name={friend.name} image={friend.image} size={36} />
              <span className="flex-1 font-bold truncate">{friend.name}</span>
              {status === 'accepted' ? (
                <span className="grid place-items-center size-6 rounded-full bg-success text-ink-1000">
                  <Check size={14} strokeWidth={3.5} absoluteStrokeWidth />
                </span>
              ) : (
                <span className="tape text-text-faint flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={3} /> pendiente
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </StepShell>
  )
}
