import { createContext } from 'react'
import type { Profile } from '../lib/api'

export interface ProfileContextValue {
  profile: Profile | null
  /** true mientras no sabemos si hay sesión o mientras se carga el perfil. */
  loading: boolean
  /** Guarda en el servidor y actualiza el estado local. */
  update: (patch: Partial<Profile>) => Promise<Profile>
  refresh: () => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
