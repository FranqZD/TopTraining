import { useState } from 'react'
import { motion } from 'motion/react'
import { KeyRound, Loader2, User } from 'lucide-react'
import { Button, SegmentedControl, TextField } from '../components/ui'
import { signIn, signUp } from '../lib/auth-client'
import { isUsername, toAuthEmail } from '../lib/username'

type Mode = 'signin' | 'signup'

/**
 * Puerta de entrada. Usuario y contraseña, nada más.
 * Google y Apple vuelven cuando estén las credenciales de producción.
 */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmed = username.trim()
    if (mode === 'signup' && trimmed.includes('@')) {
      setError('Usa un usuario, no un correo.')
      return
    }
    if (!trimmed.includes('@') && !isUsername(trimmed)) {
      setError('El usuario va de 3 a 20 caracteres: letras, números, punto o guion bajo.')
      return
    }

    setBusy(true)
    const email = toAuthEmail(trimmed)
    const name = trimmed.includes('@') ? (trimmed.split('@')[0] ?? 'Atleta') : trimmed

    const result =
      mode === 'signin'
        ? await signIn.email({ email, password })
        : await signUp.email({
            email,
            password,
            name,
          })

    if (result.error) {
      setError(translateAuthError(result.error.code, result.error.message))
      setBusy(false)
    }
    // Si sale bien, el guard de App redirige solo al ver la sesión nueva.
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <div className="app-frame max-w-[440px] flex flex-col flex-1">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 pb-10"
        >
          <span className="tape text-accent">Entrenar solo es más fácil de abandonar</span>
          <h1 className="text-display [font-variation-settings:'wdth'_120] uppercase leading-[0.92]">
            Top
            <br />
            Training
          </h1>
          <p className="text-lead text-text-muted">
            Metas, rachas y tus amigos viendo. <span className="text-ink-100 font-bold">Sin pretextos.</span>
          </p>
        </motion.header>

        <SegmentedControl
          label="Modo de acceso"
          value={mode}
          onChange={(next) => {
            setMode(next)
            setError(null)
          }}
          options={[
            { value: 'signin', label: 'Entrar' },
            { value: 'signup', label: 'Crear cuenta' },
          ]}
        />

        <form onSubmit={submit} className="flex flex-col gap-3 mt-4">
          <TextField
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value.replace(/\s/g, ''))}
            icon={<User size={18} strokeWidth={2.5} />}
            hint={mode === 'signup' ? '3 a 20 caracteres. Sin espacios.' : undefined}
          />
          <TextField
            name="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<KeyRound size={18} strokeWidth={2.5} />}
            hint={mode === 'signup' ? 'Mínimo 8 caracteres.' : undefined}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-caption text-danger bg-danger-tint border border-danger/30 rounded-[var(--radius-sm)] px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={busy} icon={busy ? <Spinner /> : undefined}>
            {mode === 'signin' ? 'Entrar' : 'Crear mi cuenta'}
          </Button>
        </form>

        <p className="text-caption text-text-faint text-center mt-auto pt-10">
          Al entrar aceptas que tus amigos vean si entrenaste. Ese es el punto.
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return <Loader2 size={20} strokeWidth={2.5} className="animate-spin" />
}

function translateAuthError(code: string | undefined, fallback?: string): string {
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Usuario o contraseña incorrectos.'
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Ya existe una cuenta con ese usuario. Mejor inicia sesión.'
    case 'PASSWORD_TOO_SHORT':
      return 'La contraseña necesita al menos 8 caracteres.'
    case 'INVALID_EMAIL':
      return 'Ese usuario no es válido.'
    default:
      return fallback ?? 'No pudimos completar la acción. Inténtalo de nuevo.'
  }
}
