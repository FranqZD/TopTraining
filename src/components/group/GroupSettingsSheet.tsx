import { useEffect, useState } from 'react'
import { Crown, Loader2, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, ChoiceGroup, Sheet } from '../ui'
import { api, type Friend, type GroupDetail } from '../../lib/api'

/**
 * Ajustes del grupo. Solo los ve el dueño, y por eso viven acá y no en el
 * panel plegable: quien entra al grupo viene a ver el feed, no a administrar.
 *
 * Nada se guarda en lote. Cada acción pega al servidor y recarga el grupo, así
 * lo que se ve es lo que quedó guardado y no hay estado a medio camino.
 */
export function GroupSettingsSheet({
  group,
  open,
  onClose,
  onChanged,
  onDeleted,
}: {
  group: GroupDetail
  open: boolean
  onClose: () => void
  /** Recarga el grupo después de cada cambio. */
  onChanged: () => Promise<void>
  onDeleted: () => void
}) {
  const [friends, setFriends] = useState<Friend[]>([])
  /** Qué acción está en vuelo, para bloquear solo esa fila. */
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!open) {
      setConfirmingDelete(false)
      setError(null)
      return
    }
    api.get<Friend[]>('/friends').then(setFriends).catch(() => setFriends([]))
  }, [open])

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch {
      setError('No se pudo. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const inGroup = new Set(group.members.map((member) => member.id))
  const invitables = friends.filter((friend) => !inGroup.has(friend.id))

  const remove = async () => {
    setBusy('delete')
    setError(null)
    try {
      await api.del(`/groups/${group.id}`)
      onDeleted()
    } catch {
      setError('No pudimos borrarlo. Inténtalo de nuevo.')
      setBusy(null)
      setConfirmingDelete(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={<span className="text-title">Ajustes del grupo</span>}>
      <div className="flex flex-col gap-7 pt-1">
        {/* --- Meta del grupo --- */}
        <section className="flex flex-col gap-3">
          <CardLabel className="mb-0">Meta del grupo</CardLabel>
          <p className="text-caption text-text-muted -mt-1">
            Entrenos por semana. La hereda todo el que no se haya puesto una propia.
          </p>
          <ChoiceGroup
            label="Meta base del grupo"
            columns={3}
            value={group.baseGoal}
            onChange={(baseGoal) => void run('goal', () => api.patch(`/groups/${group.id}`, { baseGoal }))}
            options={[3, 4, 5].map((n) => ({ value: n, label: <span className="num text-title">{n}×</span> }))}
          />
        </section>

        {/* --- Quién está adentro --- */}
        <section className="flex flex-col gap-2">
          <CardLabel className="mb-0">Miembros ({group.memberCount})</CardLabel>
          {group.members.map((member) => {
            const owner = member.role === 'owner'
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] bg-surface border border-line-soft"
              >
                <Avatar name={member.name} image={member.image} size={36} />
                <span className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="font-bold truncate leading-tight">{member.name}</span>
                  {member.isMe && <span className="tape text-accent shrink-0">tú</span>}
                  {owner && <Crown size={13} strokeWidth={2.5} className="text-warning shrink-0" />}
                </span>
                {owner ? (
                  <span className="tape text-text-faint shrink-0">dueño</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void run(member.id, () => api.del(`/groups/${group.id}/members/${member.id}`))}
                    disabled={busy !== null}
                    aria-label={`Sacar a ${member.name} del grupo`}
                    className="pressable grid place-items-center size-11 shrink-0 -mr-1.5 rounded-[var(--radius-md)] text-ink-400 hover:text-danger hover:bg-danger-tint cursor-pointer disabled:opacity-50"
                  >
                    {busy === member.id ? (
                      <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                    ) : (
                      <UserMinus size={18} strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </section>

        {/* --- Sumar gente: solo amigos, igual que al crear el grupo --- */}
        <section className="flex flex-col gap-2">
          <CardLabel className="mb-0">Agregar amigos</CardLabel>
          {invitables.length === 0 ? (
            <p className="text-caption text-text-faint">
              {friends.length === 0
                ? 'Todavía no tienes amigos aceptados. También puedes pasarles el código del grupo.'
                : 'Ya están todos tus amigos aquí adentro.'}
            </p>
          ) : (
            invitables.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700"
              >
                <Avatar name={friend.name} image={friend.image} size={36} />
                <span className="flex-1 min-w-0 font-bold truncate leading-tight">{friend.name}</span>
                <button
                  type="button"
                  onClick={() => void run(friend.id, () => api.post(`/groups/${group.id}/members`, { userId: friend.id }))}
                  disabled={busy !== null}
                  aria-label={`Agregar a ${friend.name} al grupo`}
                  className="pressable grid place-items-center size-11 shrink-0 -mr-1.5 rounded-[var(--radius-md)] text-accent hover:bg-accent-tint cursor-pointer disabled:opacity-50"
                >
                  {busy === friend.id ? (
                    <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            ))
          )}
        </section>

        {error && <p className="text-caption text-danger">{error}</p>}

        {/* --- Borrar: dos toques, y el segundo dice qué se lleva puesto --- */}
        <section className="flex flex-col gap-3 pt-1">
          <CardLabel className="mb-0">Zona de riesgo</CardLabel>
          {confirmingDelete ? (
            <Card tone="outline" className="flex flex-col gap-3 border-danger/45">
              <p className="text-body text-ink-100">¿Borrar “{group.name}”?</p>
              <p className="text-caption text-text-muted">
                Desaparece para los {group.memberCount}: el feed del grupo, el calendario y los recaps.
                Los entrenos de cada quien se quedan donde están.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => void remove()}
                  disabled={busy !== null}
                  icon={
                    busy === 'delete' ? (
                      <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} strokeWidth={2.5} />
                    )
                  }
                >
                  Sí, borrar el grupo
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setConfirmingDelete(false)} disabled={busy !== null}>
                  Mejor no
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              variant="danger"
              fullWidth
              onClick={() => setConfirmingDelete(true)}
              icon={<Trash2 size={18} strokeWidth={2.5} />}
            >
              Borrar grupo
            </Button>
          )}
        </section>
      </div>
    </Sheet>
  )
}
