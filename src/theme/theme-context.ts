import { createContext } from 'react'
import type { Palette, ThemeId } from './palettes'

export interface ThemeContextValue {
  theme: ThemeId
  palette: Palette
  setTheme: (id: ThemeId) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
