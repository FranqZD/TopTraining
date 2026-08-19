import { dailyStreak, weeklyStreak, weekStart, shiftDay, summarizeWeeks } from './src/streaks.js'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  → esperaba ${JSON.stringify(expected)}, dio ${JSON.stringify(actual)}`}`)
}
const set = (...days: string[]) => new Set(days)

// 2026-08-19 es miércoles. Lunes de esa semana: 2026-08-17.
console.log('\nsemana (lunes a domingo)')
check('miércoles → lunes',      weekStart('2026-08-19'), '2026-08-17')
check('lunes → sí mismo',       weekStart('2026-08-17'), '2026-08-17')
check('domingo → lunes previo', weekStart('2026-08-23'), '2026-08-17')
check('cruza fin de mes',       weekStart('2026-09-01'), '2026-08-31')

console.log('\nracha diaria')
check('sin check-ins', dailyStreak(set(), '2026-08-19'), 0)
check('hoy solo', dailyStreak(set('2026-08-19'), '2026-08-19'), 1)
check('3 días hasta hoy', dailyStreak(set('2026-08-17','2026-08-18','2026-08-19'), '2026-08-19'), 3)
check('no marcó hoy pero sí ayer (no se rompe)', dailyStreak(set('2026-08-17','2026-08-18'), '2026-08-19'), 2)
check('último fue anteayer → rota', dailyStreak(set('2026-08-17'), '2026-08-19'), 0)
check('hueco en el medio corta', dailyStreak(set('2026-08-15','2026-08-18','2026-08-19'), '2026-08-19'), 2)
check('cruza fin de mes', dailyStreak(set('2026-07-30','2026-07-31','2026-08-01'), '2026-08-01'), 3)

console.log('\nracha semanal (meta 3)')
const tresPorSemana = (mondays: string[]) => set(...mondays.flatMap((m) => [m, shiftDay(m, 2), shiftDay(m, 4)]))
check('sin meta → 0', weeklyStreak(tresPorSemana(['2026-08-10']), 0, '2026-08-19'), 0)
check('semana en curso incompleta no rompe',
  weeklyStreak(new Set([...tresPorSemana(['2026-08-03','2026-08-10']), '2026-08-17']), 3, '2026-08-19'), 2)
check('semana en curso completa suma',
  weeklyStreak(tresPorSemana(['2026-08-03','2026-08-10','2026-08-17']), 3, '2026-08-19'), 3)
check('semana floja corta la racha',
  weeklyStreak(new Set([...tresPorSemana(['2026-07-27']), '2026-08-04', ...tresPorSemana(['2026-08-10'])]), 3, '2026-08-19'), 1)
check('4 exactos con meta 4', weeklyStreak(set('2026-08-10','2026-08-11','2026-08-12','2026-08-13'), 4, '2026-08-19'), 1)
check('3 con meta 4 → no cumple', weeklyStreak(set('2026-08-10','2026-08-11','2026-08-12'), 4, '2026-08-19'), 0)
check('domingo cuenta en su semana', weeklyStreak(set('2026-08-14','2026-08-15','2026-08-16'), 3, '2026-08-19'), 1)

console.log('\nresumen de semanas del calendario (meta 3)')
check('semana pasada cumplida / semana pasada floja',
  summarizeWeeks(set('2026-08-03','2026-08-05','2026-08-07','2026-08-10'), ['2026-08-03','2026-08-10'], 3, '2026-08-19'),
  [{ start:'2026-08-03', count:3, goal:3, met:true, status:'met' },
   { start:'2026-08-10', count:1, goal:3, met:false, status:'missed' }])
check('la semana en curso no lleva equis',
  summarizeWeeks(set('2026-08-17'), ['2026-08-17'], 3, '2026-08-19'),
  [{ start:'2026-08-17', count:1, goal:3, met:false, status:'current' }])
check('la semana en curso ya cumplida sí lleva fuego',
  summarizeWeeks(set('2026-08-17','2026-08-18','2026-08-19'), ['2026-08-17'], 3, '2026-08-19'),
  [{ start:'2026-08-17', count:3, goal:3, met:true, status:'met' }])
check('semana futura queda neutra',
  summarizeWeeks(set(), ['2026-08-24'], 3, '2026-08-19'),
  [{ start:'2026-08-24', count:0, goal:3, met:false, status:'future' }])

console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
process.exit(failures ? 1 : 0)
