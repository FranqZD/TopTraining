import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db.js'
import { generateFriendCode } from './codes.js'

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function originsFromEnv(): string[] {
  const listed = [
    process.env.APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.TRUSTED_ORIGINS,
    'http://localhost:5173',
    'https://toptraining.franqdz.dev',
    'https://*.pages.dev',
    'https://*.workers.dev',
  ]
    .flatMap((value) => (value ? value.split(',') : []))
    .map((value) => stripSlash(value.trim()))
    .filter(Boolean)

  return [...new Set(listed)]
}

export const trustedOrigins = originsFromEnv()
export const APP_URL = stripSlash(process.env.APP_URL ?? 'http://localhost:5173')

const AUTH_URL = stripSlash(process.env.BETTER_AUTH_URL ?? APP_URL)

export function isTrustedOrigin(origin: string): boolean {
  const normalized = stripSlash(origin)
  return trustedOrigins.some((allowed) => {
    if (!allowed.includes('*')) return allowed === normalized
    const pattern = allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^.]+')
    return new RegExp(`^${pattern}$`).test(normalized)
  })
}

/** Google / Apple están pausados. El login es solo email + contraseña. */
export const enabledProviders: string[] = []

export const auth = betterAuth({
  appName: 'Top Training',
  baseURL: AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'sqlite' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  /**
   * Sesión larga: es una PWA de uso diario, nadie quiere loguearse cada vez.
   * La cookie se renueva sola cada día de uso, así que un usuario activo
   * no vuelve a ver el login nunca.
   */
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 días
    updateAge: 60 * 60 * 24, // se refresca como mucho 1 vez por día
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  /** Campos de producto que viajan dentro de session.user. */
  user: {
    additionalFields: {
      theme: { type: 'string', required: false, defaultValue: 'ember', input: false },
      trainingSlot: { type: 'string', required: false, input: false },
      targetWeightKg: { type: 'number', required: false, input: false },
      weeklyFrequency: { type: 'number', required: false, input: false },
      friendCode: { type: 'string', required: false, input: false },
      onboardingCompleted: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Todo usuario nace con su código de amistad.
          return { data: { ...user, friendCode: await generateFriendCode() } }
        },
      },
    },
  },

  trustedOrigins,
  advanced: {
    // En prod el Worker proxea /api: el origen del browser es Pages, no onrender.com.
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: AUTH_URL.startsWith('https://'),
    },
  },
})

export type Auth = typeof auth
