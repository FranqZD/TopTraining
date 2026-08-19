/**
 * Datos de prueba para desarrollo: llena de check-ins a los usuarios que ya
 * existen, para poder mirar el feed, el calendario y las rachas sin tener que
 * marcar a mano 40 días.
 *
 * Ejecutar con: npm --prefix server run db:seed
 * No crea usuarios: usá los que ya tengas registrados.
 */
import { prisma } from '../src/db.js'
import { shiftDay } from '../src/streaks.js'

const NOTES = [
  'Piernas · Cardio', 'Pecho — me costó más de lo que debería', 'Espalda · Brazos',
  'Cardio', 'Funcional — 40 min', 'Fútbol · lo dejé todo en la cancha', null, null,
]

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } })
  if (users.length === 0) {
    console.log('No hay usuarios. Registrate primero en la app.')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  let created = 0

  // Sin meta semanal no hay racha semanal que calcular, así que a los usuarios
  // que quedaron a medio onboarding les completamos el perfil.
  const SLOTS = ['morning', 'afternoon', 'night'] as const
  for (const [index, user] of users.entries()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        weeklyFrequency: [3, 4, 5][index % 3],
        trainingSlot: SLOTS[index % 3],
        targetWeightKg: 75 + index * 3,
        onboardingCompleted: true,
      },
    })
  }

  for (const [index, user] of users.entries()) {
    // Cada usuario entrena con una cadencia distinta, así las rachas no dan
    // todas lo mismo: uno constante, uno irregular, uno que abandonó.
    const pattern = [
      (offset: number) => offset % 2 === 0,             // día por medio, racha semanal sólida
      (offset: number) => offset % 7 < 4,               // 4 seguidos y descansa
      (offset: number) => offset > 6 && offset % 3 === 0, // dejó de venir hace una semana
    ][index % 3]!

    for (let offset = 0; offset < 42; offset++) {
      if (!pattern(offset)) continue
      const day = shiftDay(today, -offset)
      const existing = await prisma.checkIn.findUnique({ where: { userId_day: { userId: user.id, day } } })
      if (existing) continue
      await prisma.checkIn.create({
        data: { userId: user.id, day, note: NOTES[(offset + index) % NOTES.length] },
      })
      created++
    }
    console.log(`  ${user.name}: listo`)
  }

  console.log(`\n${created} check-ins creados.`)
}

main().finally(() => prisma.$disconnect())
