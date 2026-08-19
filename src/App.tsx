import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { ThemeProvider } from './theme/ThemeProvider'
import { isThemeId } from './theme/palettes'
import { useProfile } from './profile/useProfile'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/onboarding/OnboardingScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HomeScreen } from './screens/HomeScreen'
import { FriendsScreen } from './screens/FriendsScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { CreateGroupScreen } from './screens/groups/CreateGroupScreen'
import { JoinGroupScreen } from './screens/groups/JoinGroupScreen'
import { GroupDetailScreen } from './screens/groups/GroupDetailScreen'
import { RecapScreen } from './screens/groups/RecapScreen'
import { DesignSystemScreen } from './showcase/DesignSystemScreen'

/**
 * El tema sale del perfil, así que viaja con la cuenta: si el usuario elige
 * Voltage en el teléfono, entra por la web y lo ve igual.
 */
export default function App() {
  const { profile, update } = useProfile()
  const theme = isThemeId(profile?.theme) ? profile.theme : undefined

  return (
    <ThemeProvider
      initialTheme={theme}
      onPersist={(next) => {
        if (profile) void update({ theme: next })
      }}
    >
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginScreen /></PublicOnly>} />
        <Route path="/onboarding" element={<RequireAuth skipOnboardingGuard><OnboardingScreen /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsScreen /></RequireAuth>} />
        <Route path="/friends" element={<RequireAuth><FriendsScreen /></RequireAuth>} />
        <Route path="/checkin" element={<RequireAuth><CheckInScreen /></RequireAuth>} />
        <Route path="/groups/new" element={<RequireAuth><CreateGroupScreen /></RequireAuth>} />
        <Route path="/groups/join" element={<RequireAuth><JoinGroupScreen /></RequireAuth>} />
        <Route path="/groups/:id" element={<RequireAuth><GroupDetailScreen /></RequireAuth>} />
        <Route path="/groups/:id/recap" element={<RequireAuth><RecapScreen /></RequireAuth>} />
        <Route path="/" element={<RequireAuth><HomeScreen /></RequireAuth>} />
        {/* Muestrario del sistema de diseño (Fase 1). */}
        <Route path="/design" element={<DesignSystemScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

/** Pantalla de carga mientras resolvemos si hay sesión. */
function Splash() {
  return (
    <div className="min-h-dvh bg-canvas grid place-items-center">
      <Loader2 size={28} strokeWidth={2.5} className="animate-spin text-accent" />
    </div>
  )
}

function RequireAuth({ children, skipOnboardingGuard }: { children: React.ReactNode; skipOnboardingGuard?: boolean }) {
  const { profile, loading } = useProfile()
  const location = useLocation()

  if (loading) return <Splash />
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  // Mientras el onboarding esté incompleto, la app entera lleva ahí.
  if (!profile.onboardingCompleted && !skipOnboardingGuard) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile()

  if (loading) return <Splash />
  if (profile) return <Navigate to={profile.onboardingCompleted ? '/' : '/onboarding'} replace />

  return <>{children}</>
}
