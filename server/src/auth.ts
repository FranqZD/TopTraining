import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2'
import { prisma } from './db.js'
import { generateFriendCode } from './codes.js'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

/**
 * Proveedores sociales: solo se registran los que tienen credenciales.
 * Así el dev que clona el repo puede trabajar con email + contraseña sin
 * configurar nada, y la UI no muestra botones que van a fallar
 * (el frontend lee GET /api/config para saber cuáles hay).
 */
function socialProviders() {
  const providers: Record<string, unknown> = {}

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      ...(process.env.APPLE_APP_BUNDLE_IDENTIFIER
        ? { appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER }
        : {}),
    }
  }

  return providers
}

export const enabledProviders = Object.keys(socialProviders())

export const auth = betterAuth({
  appName: 'Top Training',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8787',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'sqlite' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // El pedido era bcrypt o argon2: usamos argon2id, que es lo recomendado hoy.
    password: {
      hash: (password) => argonHash(password, { algorithm: 2 /* argon2id */ }),
      verify: ({ hash, password }) => argonVerify(hash, password),
    },
  },

  socialProviders: socialProviders(),

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
          // Todo usuario nace con su código de amistad, venga de OAuth o de email.
          return { data: { ...user, friendCode: await generateFriendCode() } }
        },
      },
    },
  },

  trustedOrigins: [APP_URL],
  advanced: {
    // En dev el frontend entra por el proxy de Vite, así que es same-origin.
    defaultCookieAttributes: { sameSite: 'lax' },
  },
})

export type Auth = typeof auth
