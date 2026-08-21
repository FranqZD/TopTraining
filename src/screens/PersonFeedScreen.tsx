import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Avatar, Button, StreakLabel } from '../../components/ui'
import { FeedList } from '../../components/group/FeedList'
import { api, localDay, ApiError, type Friend, type PersonFeedPage, type Streaks } from '../../lib/api'
import { useProfile } from '../../profile/useProfile'

/**
 * Los entrenos de una persona. Se abre tocando su nombre o avatar en el feed,
 * los miembros del grupo, el recap o la lista de amigos.
 */
export function PersonFeedScreen() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [person, setPerson] = useState<Friend | null>(null)
  const [streaks, setStreaks] = useState<Streaks | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const mine = Boolean(profile && userId === profile.id)

  const loadPage = useCallback(
    async (cursor: string | null) => {
      const query = new URLSearchParams({ limit: '25', today: localDay() })
      if (cursor) query.set('cursor', cursor)
      const page = await api.get<PersonFeedPage>(`/users/${userId}/feed?${query}`)
      setPerson(page.user)
      setStreaks(page.streaks)
      setForbidden(false)
      return page
    },
    [userId],
  )

  useEffect(() => {
    setPerson(null)
    setStreaks(null)
    setForbidden(false)
  }, [userId])

  const wrappedLoad = useCallback(
    async (cursor: string | null) => {
      try {
        return await loadPage(cursor)
      } catch (error) {
        if (
          !cursor &&
          error instanceof ApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          setForbidden(true)
        }
        throw error
      }
    },
    [loadPage],
  )

  if (!userId) return null

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-6">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-headline truncate">{mine ? 'Tus entrenos' : 'Entrenos'}</h1>
        </header>

        {forbidden && !person ? (
          <div className="flex flex-col gap-4 pt-8">
            <p className="text-title">No puedes ver esos entrenos.</p>
            <p className="text-caption text-text-muted">Tienen que ser amigos o compartir un grupo.</p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </div>
        ) : (
          <>
            {person ? (
              <div className="flex items-center gap-4">
                <Avatar name={person.name} image={person.image} size={64} />
                <div className="min-w-0">
                  <p className="text-title truncate leading-tight">
                    {person.name}
                    {mine && <span className="tape text-accent ml-2">tú</span>}
                  </p>
                  {streaks && <StreakLabel streaks={streaks} className="mt-1" />}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="size-16 rounded-full bg-ink-850 border border-ink-700" />
                <Loader2 size={20} strokeWidth={2.5} className="animate-spin text-ink-500" />
              </div>
            )}

            <div className="pb-10">
              <FeedList
                sourceKey={userId}
                loadPage={wrappedLoad}
                empty={mine ? 'Todavía no marcaste ningún entrenamiento.' : 'Todavía no marcó ningún entrenamiento.'}
                emptyHint={mine ? 'Un toque en Inicio y queda el primero.' : undefined}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
