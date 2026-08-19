import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

/**
 * Cliente de better-auth. No lleva baseURL porque en dev el proxy de Vite
 * manda /api al servidor: para el browser es todo el mismo origen.
 *
 * Los campos extra se declaran acá (y no importando el tipo del server)
 * porque frontend y backend son dos paquetes separados.
 */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      // `input: false` + `required: false` deben espejar el server: si no,
      // el tipo de signUp.email pediría todos estos campos en el registro.
      user: {
        theme: { type: 'string', required: false, input: false },
        trainingSlot: { type: 'string', required: false, input: false },
        targetWeightKg: { type: 'number', required: false, input: false },
        weeklyFrequency: { type: 'number', required: false, input: false },
        friendCode: { type: 'string', required: false, input: false },
        onboardingCompleted: { type: 'boolean', required: false, input: false },
      },
    }),
  ],
})

export const { useSession, signIn, signUp, signOut } = authClient
