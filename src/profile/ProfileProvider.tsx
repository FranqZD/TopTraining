import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type Profile } from '../lib/api'
import { useSession } from '../lib/auth-client'
import { ProfileContext } from './profile-context'

/**
 * Perfil del usuario logueado. La sesión la maneja better-auth; acá vive el
 * perfil de producto (nombre, horario, peso, frecuencia, tema, código).
 *
 * Se guarda contra el servidor y se refleja en el estado local de una,
 * así el cambio de tema o de nombre se ve al instante.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const userId = session?.user?.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    setLoadingProfile(true)
    try {
      setProfile(await api.get<Profile>('/me'))
    } catch {
      setProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * La zona horaria se manda sola. El cron de recordatorios la necesita para
   * saber qué hora es PARA EL USUARIO, y preguntársela sería absurdo cuando el
   * navegador ya la sabe.
   */
  useEffect(() => {
    if (!profile) return
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone && timeZone !== profile.timeZone) {
      void api.patch<Profile>('/me', { timeZone }).then(setProfile).catch(() => {})
    }
  }, [profile])

  const update = useCallback(async (patch: Partial<Profile>) => {
    const updated = await api.patch<Profile>('/me', patch)
    setProfile(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ profile, loading: sessionPending || (Boolean(userId) && !profile && loadingProfile), update, refresh }),
    [profile, sessionPending, userId, loadingProfile, update, refresh],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
