import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Flame, Plus, Settings, Users } from 'lucide-react'
import { Avatar, Card, CardLabel, DayMark } from '../components/ui'
import { api, localDay, type CheckIn, type Friend, type FriendRequests, type Group } from '../lib/api'
import { thumbnail } from '../lib/photo'
import { useProfile } from '../profile/useProfile'

/**
 * Home. El orden no es casual: primero la acción del día, después tus grupos,
 * después la gente. Lo que se hace todos los días va arriba de todo.
 */
export function HomeScreen() {
  const { profile } = useProfile()
  const [groups, setGroups] = useState<Group[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState(0)
  const [todaysCheckIn, setTodaysCheckIn] = useState<CheckIn | null>(null)

  useEffect(() => {
    api.get<Group[]>('/groups').then(setGroups).catch(() => setGroups([]))
    api.get<Friend[]>('/friends').then(setFriends).catch(() => setFriends([]))
    api
      .get<FriendRequests>('/friends/requests')
      .then((requests) => setPending(requests.incoming.length))
      .catch(() => setPending(0))
    // Una sola consulta resuelve el estado del día: el último check-in.
    api
      .get<{ checkIn: CheckIn | null }>('/checkins/latest')
      .then(({ checkIn }) => setTodaysCheckIn(checkIn?.day === localDay() ? checkIn : null))
      .catch(() => setTodaysCheckIn(null))
  }, [])

  const checkedInToday = todaysCheckIn !== null

  if (!profile) return null

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-[440px] px-5 py-6 flex flex-col gap-7">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={profile.name} image={profile.image} />
            <div className="min-w-0">
              <p className="tape text-text-faint">Hola</p>
              <p className="text-title truncate">{profile.name}</p>
            </div>
          </div>
          <Link
            to="/settings"
            aria-label="Ajustes"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 hover:text-ink-50"
          >
            <Settings size={20} strokeWidth={2.5} />
          </Link>
        </header>

        {/* ------------------------------------------------------------------
            La acción del día: primer bloque, ancho completo, siempre visible.
            No hace falta entrar a ningún grupo para marcar.
           ------------------------------------------------------------------ */}
        <section aria-label="Check-in de hoy">
          {checkedInToday ? (
            <Link
              to="/checkin"
              className="pressable flex items-center gap-4 p-4 rounded-[var(--radius-lg)] notch bg-success-tint border border-success/45"
            >
              <DayMark state="done" size="lg" />
              <span className="flex-1 min-w-0">
                <span className="block text-title leading-tight">Ya entrenaste hoy</span>
                <span className="block text-caption text-text-muted truncate">
                  {todaysCheckIn?.note ? todaysCheckIn.note : 'Toca para editarlo o deshacerlo.'}
                </span>
              </span>
              {todaysCheckIn?.photoUrl && (
                <img
                  src={thumbnail(todaysCheckIn.photoUrl, 120)}
                  alt=""
                  className="size-14 rounded-[var(--radius-md)] object-cover border border-success/30 shrink-0"
                />
              )}
            </Link>
          ) : (
            <Link
              to="/checkin"
              className="pressable flex items-center gap-4 p-4 rounded-[var(--radius-lg)] notch bg-accent text-on-accent shadow-accent"
            >
              <span className="grid place-items-center size-12 rounded-[var(--radius-md)] bg-on-accent/12 shrink-0">
                <Flame size={26} strokeWidth={2.5} fill="currentColor" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-title leading-tight">Marcar hoy</span>
                <span className="block text-caption opacity-80">Un toque y queda registrado.</span>
              </span>
              <ChevronRight size={22} strokeWidth={3} className="shrink-0 opacity-70" />
            </Link>
          )}
        </section>

        {/* --- Grupos --- */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardLabel className="mb-0">Tus grupos ({groups.length})</CardLabel>
            <Link to="/groups/join" className="tape text-accent hover:underline">
              tengo un código
            </Link>
          </div>

          {groups.length === 0 ? (
            <Card tone="outline">
              <p className="text-body text-ink-200">Todavía no estás en ningún grupo.</p>
              <p className="text-caption text-text-faint mt-1">
                Un grupo es el viaje, la meta y la gente que te va a echar carrilla si no vas.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="pressable flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-surface border border-line-soft shadow-card hover:border-ink-600"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-title truncate leading-tight">{group.name}</span>
                    <span className="block text-caption text-text-faint mt-0.5">
                      {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'} · meta{' '}
                      {group.baseGoal}× por semana
                      {group.personalGoal !== null && ` · la tuya ${group.personalGoal}×`}
                    </span>
                  </span>
                  <span className="num text-headline text-accent shrink-0">{group.effectiveGoal}×</span>
                  <ChevronRight size={20} strokeWidth={2.5} className="text-ink-500 shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* Link con pinta de botón secundario: no anidamos <button> en <a>. */}
          <Link
            to="/groups/new"
            className="pressable inline-flex items-center justify-center gap-2 w-full h-[var(--size-control)] px-6 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-50 font-bold tracking-tighter hover:bg-ink-800 hover:border-ink-600"
          >
            <Plus size={20} strokeWidth={3} />
            Crear un grupo
          </Link>
        </section>

        {/* --- Amigos --- */}
        <section className="flex flex-col gap-3 pb-10">
          <CardLabel className="mb-0">Gente</CardLabel>
          <Link
            to="/friends"
            className="pressable flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-surface border border-line-soft hover:border-ink-600"
          >
            <span className="grid place-items-center size-11 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 shrink-0">
              <Users size={20} strokeWidth={2.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold leading-tight">Amigos</span>
              <span className="block text-caption text-text-faint">
                {friends.length === 0 ? 'Todavía nadie' : `${friends.length} en total`}
              </span>
            </span>
            {pending > 0 && (
              <span className="tape px-2 py-1 rounded-[var(--radius-pill)] bg-accent text-on-accent shrink-0">
                {pending} {pending === 1 ? 'solicitud' : 'solicitudes'}
              </span>
            )}
            <ChevronRight size={20} strokeWidth={2.5} className="text-ink-500 shrink-0" />
          </Link>
        </section>
      </div>
    </div>
  )
}
