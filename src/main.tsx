import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './theme/ThemeProvider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Cuando exista auth, acá entran initialTheme={user.theme} y
        onPersist={(t) => api.patch('/me', { theme: t })}. */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
