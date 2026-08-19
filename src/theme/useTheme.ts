import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'

/** Tema activo + setter. Cualquier componente puede cambiar la paleta. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
