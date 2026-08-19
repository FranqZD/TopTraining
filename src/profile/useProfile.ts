import { useContext } from 'react'
import { ProfileContext, type ProfileContextValue } from './profile-context'

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile debe usarse dentro de <ProfileProvider>')
  return ctx
}
