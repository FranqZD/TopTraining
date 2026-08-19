import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ProfileProvider } from './profile/ProfileProvider'
import App from './App'
import { registerServiceWorker } from './lib/push'
import './index.css'

// El service worker habilita el push y que la app se pueda instalar.
// Se registra después del primer render para no competir con la carga.
window.addEventListener('load', () => void registerServiceWorker())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </BrowserRouter>
  </StrictMode>,
)
