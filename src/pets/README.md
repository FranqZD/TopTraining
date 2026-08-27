# Mascotas fitness — paquete React

SVG animado, sin dependencias, listo para Vite + React 19.
Nada de GIF: es vectorial, escala sin pérdida y toma los colores de tu tema.

## Instalar

Copia la carpeta a tu app (`src/pets/`):

| archivo | qué es |
| --- | --- |
| `Pet.jsx` | componente + arte de las 40 combinaciones |
| `pets.css` | las 20 keyframes (una hoja, ~3 KB) |
| `petState.js` | lógica de estado compartida front + backend |
| `PetGallery.jsx` | página de prueba con todos los estados (borrable) |

```jsx
import { Pet } from './pets/Pet';
import './pets/pets.css';

<Pet species="bonsai" level={4} health="ok" size={120} />
```

## API

| prop | valores | nota |
| --- | --- | --- |
| `species` | `blob` `gem` `bird` `plant` `bonsai` | |
| `level` | `1`–`5` | objetivos cumplidos · permanente, nunca baja |
| `health` | `ok` `day1` `days3` `dormant` | inactividad reciente · se superpone sin quitar nivel |
| `size` | px (default `96`) | viewBox 0 0 100 100 |
| `paused` | `boolean` | congela la animación (listas largas, capturas) |

También se exportan `SPECIES`, `HEALTH`, `LEVEL_NAMES`, `HEALTH_NAMES` y `petLabel(species, level, health)`.

## Estado: una sola fuente de verdad

`petState.js` es JS puro sin imports: úsalo igual en el cliente y en Express.

```js
import { petState } from './pets/petState.js';

const { level, health, days } = petState({
  objectivesCompleted: user.objectivesCompleted,
  lastCheckIn: user.lastCheckIn,
});
```

Reglas que implementa:

- `level = min(objetivosCumplidos, 5)` y nunca decrece (usa `bumpLevel` al guardar).
- `health`: `ok` (hoy) → `day1` (1 día) → `days3` (2–3 días) → `dormant` (7+ días).
- `dormant` es hibernación, no muerte: el siguiente check-in vuelve a `ok` sin perder nivel.

### Express

```js
import { petState, bumpLevel } from '../shared/petState.js';

app.get('/api/pet/:userId', async (req, res) => {
  const u = await db.getUser(req.params.userId);
  res.json({
    species: u.species,
    ...petState({ objectivesCompleted: u.objectivesCompleted, lastCheckIn: u.lastCheckIn }),
  });
});

app.post('/api/pet/:userId/check-in', async (req, res) => {
  const u = await db.getUser(req.params.userId);
  const objectivesCompleted = u.objectivesCompleted + (req.body.objectiveDone ? 1 : 0);
  await db.updateUser(u.id, {
    objectivesCompleted,
    petLevel: bumpLevel(u.petLevel, objectivesCompleted),
    lastCheckIn: new Date().toISOString(),
  });
  res.json(petState({ objectivesCompleted, lastCheckIn: Date.now() }));
});
```

Para compartir el archivo entre front y back, ponlo en `shared/petState.js` e impórtalo desde ambos (`"type": "module"` en el package.json del backend).

## Colores

`pets.css` define los tokens sobre `.pet`; sobrescríbelos donde quieras:

```css
.pet { --pet-accent: #ec3013; --pet-ink: #201e1d; --pet-bg: #f3f2f2; }
[data-theme='dark'] .pet { --pet-ink: #f3f2f2; --pet-bg: #201e1d; }
```

## Rendimiento y accesibilidad

- Un bucle por estado, solo `transform` y `opacity` (nunca layout).
- La velocidad sube con el nivel: 5 objetivos late al doble de ritmo que 1.
- `prefers-reduced-motion: reduce` desactiva todo el movimiento.
- Cada `<svg>` lleva `role="img"`, `<title>` y `aria-label` con el nombre del estado.
- En grillas largas pasa `paused` a las que no están a la vista.

## Celebrar el cambio de nivel

El componente es stateless. Para el momento "subiste de nivel", monta el nivel nuevo y añade la transición en el contenedor — por ejemplo un `scale` 0.9 → 1.1 → 1 de 400 ms — o superpón un Lottie de celebración. El arte no necesita nada más.
