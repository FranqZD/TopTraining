import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_THEME, PALETTES_BY_ID, isThemeId, type ThemeId } from './palettes'
import { ThemeContext } from './theme-context'

/**
 * Aplica el tema pintando `data-theme` en <html>. Toda la app se repinta sola
 * porque cada componente consume variables CSS (--color-accent y derivados),
 * nunca hex hardcodeados.
 *
 * Persistencia en dos capas:
 *  - localStorage: respuesta instantánea y offline (es una PWA).
 *  - `onPersist`: gancho para guardar `User.theme` en el backend cuando exista
 *    la capa de auth. Si falla, el tema local se mantiene igual.
 */

const STORAGE_KEY = 'toptraining.theme'

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isThemeId(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

interface ThemeProviderProps {
  children: ReactNode
  /** Tema del perfil del usuario (User.theme). Manda sobre el guardado local. */
  initialTheme?: ThemeId
  /** Guardar en el perfil remoto. */
  onPersist?: (theme: ThemeId) => void | Promise<void>
}

export function ThemeProvider({ children, initialTheme, onPersist }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(() => initialTheme ?? readStoredTheme())

  // El perfil remoto gana cuando llega (login o cambio desde otro dispositivo).
  useEffect(() => {
    if (initialTheme && initialTheme !== theme) setThemeState(initialTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTheme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setTheme = useCallback(
    (id: ThemeId) => {
      setThemeState(id)
      try {
        localStorage.setItem(STORAGE_KEY, id)
      } catch {
        /* modo privado / storage lleno: el tema igual aplica en esta sesión */
      }
      void onPersist?.(id)
    },
    [onPersist],
  )

  const value = useMemo(
    () => ({ theme, palette: PALETTES_BY_ID[theme], setTheme }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
