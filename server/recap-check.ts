/**
 * Test de integración del recap: arma un grupo con datos controlados, calcula
 * y verifica el ranking. Crea y borra sus propias filas, así que se puede
 * correr sobre la base de desarrollo sin ensuciarla.
 */
import { prisma } from './src/db.js'
import { computeRecap } from './src/recap.js'
import { shiftDay } from './src/streaks.js'

const PREFIX = 'test-recap-'
const MONTH = '2026-07' // julio 2026: sus lunes son 6, 13, 20 y 27 → 4 semanas
const TODAY = '2026-08-19' // el mes ya cerró

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  → esperaba ${JSON.stringify(expected)}, dio ${JSON.stringify(actual)}`}`)
}

async function cleanup() {
  await prisma.group.deleteMany({ where: { id: { startsWith: PREFIX } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIX } } })
}

async function main() {
  await cleanup()

  const people = [
    // Ana cumple las 4 semanas con la meta del grupo (3).
    { id: `${PREFIX}ana`, name: 'Ana', goal: null, perWeek: 3 },
    // Beto se puso 5 y hace 2: no cumple ninguna.
    { id: `${PREFIX}beto`, name: 'Beto', goal: 5, perWeek: 2 },
    // Caro cumple 2 de 4.
    { id: `${PREFIX}caro`, name: 'Caro', goal: null, perWeek: 0 },
  ]

  for (const person of people) {
    await prisma.user.create({
      data: { id: person.id, name: person.name, email: `${person.id}@test.local`, friendCode: person.id.slice(-6).toUpperCase() },
    })
  }

  await prisma.group.create({
    data: {
      id: `${PREFIX}grupo`,
      name: 'Los del recap',
      baseGoal: 3,
      inviteCode: 'RECAP1',
      ownerId: people[0]!.id,
      createdAt: new Date('2026-06-01T00:00:00Z'),
      members: {
        create: people.map((person) => ({ userId: person.id, personalGoal: person.goal })),
      },
    },
  })

  const mondays = ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27']
  const days: { userId: string; day: string }[] = []

  for (const monday of mondays) {
    for (const person of people) {
      for (let index = 0; index < person.perWeek; index++) {
        days.push({ userId: person.id, day: shiftDay(monday, index) })
      }
    }
  }
  // Caro: cumple solo las dos primeras semanas, y en la primera hace 4 días
  // seguidos (para probar la racha más larga del mes).
  for (const day of [0, 1, 2, 3]) days.push({ userId: people[2]!.id, day: shiftDay(mondays[0]!, day) })
  for (const day of [0, 2, 4]) days.push({ userId: people[2]!.id, day: shiftDay(mondays[1]!, day) })
  // Un entreno de Ana en junio: no tiene que contar para julio.
  days.push({ userId: people[0]!.id, day: '2026-06-30' })

  await prisma.checkIn.createMany({ data: days })

  const recap = (await computeRecap(`${PREFIX}grupo`, MONTH, TODAY))!
  const by = (name: string) => recap.members.find((member) => member.name === name)!

  console.log('\nrecap de julio 2026 (meta del grupo: 3×)')
  check('el mes está cerrado, no es parcial', recap.partial, false)
  check('4 semanas evaluadas', recap.weeksEvaluated, 4)

  console.log('\npor persona')
  check('Ana cumple 4 de 4', [by('Ana').weeksMet, by('Ana').weeksEvaluated], [4, 4])
  check('Ana usa la meta del grupo', by('Ana').goal, 3)
  check('el entreno de junio no cuenta en julio', by('Ana').checkIns, 12)
  check('Beto no cumple ninguna (se puso 5 y hace 2)', [by('Beto').weeksMet, by('Beto').goal], [0, 5])
  check('Caro cumple 2 de 4', by('Caro').weeksMet, 2)
  check('la racha más larga de Caro es 4', by('Caro').longestStreak, 4)

  console.log('\ndestacados')
  check('el mejor es Ana', recap.best?.name, 'Ana')
  check('el más huevón es Beto', recap.worst?.name, 'Beto')
  check('cumplimiento del grupo: 6 de 12 semanas-persona', recap.completion, 0.5)
  check('nadie fue perfecto en grupo', recap.everyoneDelivered, false)

  console.log('\nmes en curso (parcial)')
  const partial = (await computeRecap(`${PREFIX}grupo`, '2026-08', TODAY))!
  check('agosto viene marcado como parcial', partial.partial, true)
  check('no cuenta la semana en curso ni las futuras', partial.members[0]!.weeksEvaluated, 2)

  console.log('\ncasos borde')
  await prisma.checkIn.deleteMany({ where: { userId: { startsWith: PREFIX } } })
  const empty = (await computeRecap(`${PREFIX}grupo`, MONTH, TODAY))!
  check('sin ningún entreno no hay destacados', [empty.best?.name ?? null, empty.worst?.name ?? null], [null, null])
  check('cumplimiento 0, no null (las semanas se evaluaron)', empty.completion, 0)

  // Con todos empatados en cero tampoco hay a quién cargar.
  await prisma.checkIn.createMany({ data: people.map((person) => ({ userId: person.id, day: '2026-07-06' })) })
  const tied = (await computeRecap(`${PREFIX}grupo`, MONTH, TODAY))!
  check('si están todos empatados, no se carga a nadie', tied.worst, null)
  await prisma.checkIn.deleteMany({ where: { userId: { startsWith: PREFIX } } })

  // Todos cumplen todo: no hay a quién cargar.
  const perfect: { userId: string; day: string }[] = []
  for (const monday of mondays) {
    for (const person of people) {
      const goal = person.goal ?? 3
      for (let index = 0; index < goal; index++) perfect.push({ userId: person.id, day: shiftDay(monday, index) })
    }
  }
  await prisma.checkIn.createMany({ data: perfect })
  const flawless = (await computeRecap(`${PREFIX}grupo`, MONTH, TODAY))!
  check('si cumplieron todos, nadie es el huevón', flawless.worst, null)
  check('y el grupo queda en 100%', flawless.completion, 1)
  check('everyoneDelivered en true', flawless.everyoneDelivered, true)
}

main()
  .then(cleanup)
  .catch(async (error) => {
    console.error(error)
    failures++
    await cleanup()
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
    process.exit(failures ? 1 : 0)
  })
