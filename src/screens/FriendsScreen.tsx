import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Clock, X } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, StreakLabel } from '../components/ui'
import { AddFriendPanel } from '../components/friends/AddFriendPanel'
import { api, localDay, type FriendRequests, type FriendWithStreaks } from '../lib/api'
import { useProfile } from '../profile/useProfile'

/**
 * Amigos: bandeja de solicitudes arriba (es lo que requiere acción), después
 * la lista, y al final el panel para sumar gente nueva.
 *
 * La fila de cada amigo ya reserva el lugar de la racha semanal — todavía no
 * hay datos, así que se ven los 7 días apagados.
 */
export function FriendsScreen() {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendWithStreaks[]>([])
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] })
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [friendList, requestList] = await Promise.all([
      api.get<FriendWithStreaks[]>(`/friends?today=${localDay()}`).catch(() => []),
      api.get<FriendRequests>('/friends/requests').catch(() => ({ incoming: [], outgoing: [] })),
    ])
    setFriends(friendList)
    setRequests(requestList)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id)
    try {
      await api.post(`/friends/requests/${id}/${accept ? 'accept' : 'decline'}`)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (!profile) return null

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
          <h1 className="text-headline">Amigos</h1>
        </header>

        {/* --- Solicitudes recibidas: lo único que pide acción --- */}
        <AnimatePresence initial={false}>
          {requests.incoming.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <CardLabel className="text-accent">Te quieren agregar ({requests.incoming.length})</CardLabel>
              {requests.incoming.map((request) => (
                <Card key={request.id} tone="accent" className="flex items-center gap-3 !p-3">
                  <Avatar name={request.user.name} image={request.user.image} size={40} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate leading-tight">{request.user.name}</span>
                    <span className="block tape text-text-faint">{request.user.friendCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void respond(request.id, false)}
                    disabled={busyId === request.id}
                    aria-label={`Rechazar a ${request.user.name}`}
                    className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] border border-ink-700 text-ink-400 hover:text-danger hover:border-danger/50 cursor-pointer"
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                  <Button size="sm" onClick={() => void respond(request.id, true)} disabled={busyId === request.id}>
                    Aceptar
                  </Button>
                </Card>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* --- Amigos --- */}
        <section className="flex flex-col gap-2">
          <CardLabel>Tus amigos ({friends.length})</CardLabel>
          {friends.length === 0 ? (
            <Card tone="outline">
              <p className="text-caption text-text-muted">
                Todavía no tienes a nadie. Comparte tu código{' '}
                <span className="num text-ink-100">{profile.friendCode}</span> o busca por nombre aquí abajo.
              </p>
            </Card>
          ) : (
            friends.map((friend) => (
              <Link
                key={friend.id}
                to={`/u/${friend.id}`}
                className="pressable flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] bg-surface border border-line-soft hover:border-ink-600"
              >
                <Avatar name={friend.name} image={friend.image} size={44} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate leading-tight">{friend.name}</span>
                  <StreakLabel streaks={friend.streaks} className="mt-1" />
                </span>
              </Link>
            ))
          )}
        </section>

        {/* --- Solicitudes enviadas --- */}
        {requests.outgoing.length > 0 && (
          <section className="flex flex-col gap-2">
            <CardLabel>Esperando respuesta ({requests.outgoing.length})</CardLabel>
            {requests.outgoing.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border border-ink-800"
              >
                <Avatar name={request.user.name} image={request.user.image} size={36} className="opacity-60" />
                <span className="flex-1 font-bold truncate text-ink-300">{request.user.name}</span>
                <span className="tape text-text-faint flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={3} /> pendiente
                </span>
              </div>
            ))}
          </section>
        )}

        {/* --- Agregar --- */}
        <section className="flex flex-col gap-3 pb-10">
          <CardLabel>Sumar gente</CardLabel>
          <AddFriendPanel myCode={profile.friendCode} onRequestSent={() => void load()} />
        </section>
      </div>
    </div>
  )
}
