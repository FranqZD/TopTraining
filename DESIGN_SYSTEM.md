# Top Training — Sistema de diseño v1

> Regla de oro: **ninguna pantalla inventa valores.** Si necesitás un color, un
> tamaño, un radio o una duración que no está acá, se agrega primero al sistema
> y después se usa. Eso es lo que evita que la app termine pareciendo una
> plantilla genérica.

---

## 1. Qué se ve y por qué

**Personalidad:** enérgica, directa, un poco hincha pelotas. Habla de vos y te
carga. Pero se ve limpia: el humor está en el texto y en el ritmo, no en
formas infantiles ni en decoración.

**Decisiones deliberadas (y lo que evitamos):**

| Hacemos | No hacemos |
|---|---|
| Carbón cálido `#0A0A0B` como fondo | Blanco, gris azulado o negro puro |
| Un acento sólido y plano, muy saturado | Gradientes morados de plantilla |
| Tipografía ancha (Expanded) y apretada en números | Fuente del sistema / Arial |
| Sombra de color como única "luz" | Glassmorphism, neumorfismo, blur porque sí |
| Labels micro en caja alta muy espaciados ("tape") | Títulos centrados tipo landing SaaS |
| Esquina cortada en diagonal como detalle técnico | Bordes redondeados uniformes en todo |
| Contenedor de 480px, layout de app móvil | Grid de dashboard corporativo |

---

## 2. Dónde vive cada cosa

```
src/styles/tokens.css   ← todo lo que NO cambia entre temas
src/styles/themes.css   ← las 5 paletas de acento
src/index.css           ← base + utilidades de marca (.num .tape .notch .hatch .pressable)
src/theme/palettes.ts   ← catálogo en TS (tipo ThemeId = campo User.theme)
src/theme/ThemeProvider.tsx ← aplica y persiste el tema
src/components/ui/      ← componentes base
src/components/brand/   ← marcas de Google/Apple (única excepción a "solo lucide")
src/showcase/           ← pantalla de referencia visual (no es producto)
```

Ver el sistema andando: `npm run dev`.

### 2.1 Inventario de componentes

| Componente | Para qué | Teclado |
|---|---|---|
| `Button` | 4 variantes (primary/secondary/ghost/danger) × 3 tamaños | — |
| `Card` + `CardLabel` `CardTitle` | superficies: base, raised, accent, outline; `notch` opcional | — |
| `ChoiceGroup` | **el primitivo de "sin teclado"**: opciones acotadas en grilla táctil | no |
| `SegmentedControl` | alternar 2–3 vistas, con píldora de acento deslizándose | no |
| `NumberStepper` | número grande con −/+ (peso objetivo) | opcional |
| `DayMark` / `StreakBadge` | cumplido · perdido · hoy · sin datos · racha | — |
| `ProgressBar` | progreso por pasos (onboarding) | — |
| `CheckRow` | selección múltiple (a qué amigos meto al grupo); toda la fila es táctil | no |
| `Switch` | prender/apagar algo que ya existe (qué avisos quiero); fila táctil entera | no |
| `WeekStreakSlot` | hueco reservado de la racha semanal en listas de gente | — |
| `Sheet` | hoja inferior (vista de un entreno, selector de miembro) | no |
| `StreakLabel` | la racha en una línea: días, semanas o "racha rota" | — |
| `ThemePicker` | las 5 paletas como swatches | no |
| `Avatar` | iniciales o foto del proveedor social | — |
| `TextField` | **último recurso**: nombre, email, contraseña, peso, código, búsqueda | sí |

---

## 3. Color

### 3.1 Base (igual en los 5 temas)

Rampa `ink-1000 → ink-50`, carbón levemente cálido. El blanco de marca es
`#F5F5F7`, nunca `#FFF`.

Alias semánticos — **usá estos en los componentes, no la rampa cruda**:

| Token | Uso |
|---|---|
| `bg-canvas` | fondo de la app |
| `bg-surface` | card sobre el fondo |
| `bg-surface-raised` | card sobre card, sheets |
| `bg-surface-hover` | superficie interactiva / hover |
| `border-line` / `border-line-soft` | divisores y bordes |
| `text-text` / `text-text-muted` / `text-text-faint` | primario / secundario / metadata |

`text-text-faint` (`ink-400`) está calibrado en 4.6:1 sobre superficie: es el
mínimo AA. Por debajo de eso no bajamos.

### 3.2 Paletas de acento

Cinco, todas de la misma calidad, ninguna es "la default disfrazada":

| id | nombre | acento | carácter |
|---|---|---|---|
| `ember` | Ember | `#FF4E33` | coral eléctrico — urgencia, calor (default) |
| `voltage` | Voltage | `#C9F73C` | lima fluorescente — energía cruda |
| `plasma` | Plasma | `#3BA0FF` | azul frío — técnico, disciplinado |
| `magma` | Magma | `#FFAE1A` | ámbar denso — oro de medalla |
| `pulse` | Pulse | `#FF3D9A` | magenta de after — provocador |

Cada paleta define **6 valores y nada más**: `accent`, `accent-strong`,
`on-accent`, `success`, `warning`, `danger`. Todo lo demás (tinte, línea,
glow, sombra, texto de acento) se **deriva con `color-mix()`** en un solo lugar.

**Contrastes verificados** (WCAG, sobre `surface #101012`):

| tema | acento | texto sobre acento | success | warning | danger |
|---|---|---|---|---|---|
| ember | 5.8:1 | 6.0:1 | 9.6 | 11.7 | 5.0 |
| voltage | 15.3:1 | 14.8:1 | 10.5 | 9.6 | 5.8 |
| plasma | 6.9:1 | 7.0:1 | 9.6 | 10.4 | 5.8 |
| magma | 10.3:1 | 10.2:1 | 9.6 | 7.3 | 5.0 |
| pulse | 5.8:1 | 6.0:1 | 9.6 | 10.4 | 6.2 |

Firma de marca y regla dura: **el texto sobre el acento es siempre casi negro**
(`--color-on-accent`). Por eso todo acento nuevo tiene que ser luminoso.

### 3.3 Significado del color (invariable en toda la app)

| Color | Significa | Dónde |
|---|---|---|
| `accent` | racha viva, acción principal, "vos" | CTA, llama, día de hoy |
| `success` | día cumplido | check del calendario y del feed |
| `warning` | en riesgo, te queda poco | racha por romperse, meta al límite |
| `danger` | día perdido, racha rota, acción destructiva | equis, "abandonar reto" |
| `idle` | sin actividad / sin datos | días futuros, amigos sin registro |

---

## 4. Tipografía

**Archivo Variable** (ejes `wdth 62..125`, `wght 100..900`). Una sola familia,
dos voces: UI en ancho normal, titulares y números en Expanded. Eso es lo que
da el aire atlético sin sumar una segunda fuente.

| Token | px | Uso |
|---|---|---|
| `text-stat-xl` | 72 | número héroe (racha del recap) |
| `text-stat` | 48 | número destacado (4/5, 86%) |
| `text-display` | 40 | pregunta de onboarding, hero |
| `text-headline` | 28 | título de pantalla |
| `text-title` | 22 | título de card |
| `text-lead` | 18 | bajada |
| `text-body` | 16 | cuerpo (nunca menos, evita el zoom de iOS en inputs) |
| `text-caption` | 14 | secundario, timestamps |
| `text-label` | 13 | labels de formulario |
| `text-micro` | 11 | "tape", metadata |

Utilidades:

- `.num` — Expanded 118 + tabular + tracking cerrado. **Todo número grande la usa.**
- `.tape` — 11px, mayúsculas, tracking 0.14em. El sello de la marca; encabeza bloques.

---

## 5. Forma, espacio y movimiento

- **Radios:** `xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill`. Botones `md`, cards `lg`, sheets `xl`.
- **Alturas táctiles:** `--size-touch 44px` (mínimo absoluto), `--size-control 52px` (botón estándar), `--size-control-lg 60px` (CTA de pantalla).
- **Espaciado:** escala de 4px de Tailwind. Padding de card: 20px (`p-5`). Separación entre secciones: 48px (`gap-12`).
- **Movimiento:** `--duration-instant 90ms` (press) · `fast 160ms` (color) · `base 260ms` (entradas) · `slow 420ms`. Curva `--ease-snap`. Los resortes usan `stiffness 520–620 / damping 22–26`: rebote corto, nunca elástico.
- Todo lo tocable lleva `.pressable` (se hunde a 0.97 al presionar).
- `prefers-reduced-motion` desactiva animaciones globalmente.

---

## 6. Iconografía

**lucide-react, y solo lucide-react.** No se mezcla con otro set. Grosor 2.5
en UI, 3+ en glifos chicos.

Las tres marcas que se repiten en feed, calendario y lista de amigos se
distinguen **por forma antes que por color** (importa para daltonismo y para
miniaturas de 20px):

| Estado | Forma | Color |
|---|---|---|
| Cumplido | cuadrado **sólido**, check casi negro encima | `success` |
| Perdido | cuadrado **hueco** con trama diagonal + equis | `danger` |
| Hoy | cuadrado hueco con borde grueso y punto central | `accent` |
| Sin datos | cuadrado hueco con trama, sin glifo | `idle` |
| Racha | **píldora** con llama rellena + número | `accent` / `warning` / `idle` |

Componentes: `<DayMark state size animate />` y `<StreakBadge days state size />`.

---

## 7. Tema personalizable (feature de producto)

1. El usuario elige paleta en **Ajustes** y en el **último paso del onboarding**
   (después de agregar amigos), con `<ThemePicker />`. Un toque aplica; sin
   guardar, sin confirmar, sin teclado.
2. `ThemeProvider` escribe `data-theme` en `<html>`. Como **todos** los
   componentes consumen variables CSS, la app entera se repinta: feed,
   calendario, badges, botones, gráficos.
3. Persistencia en dos capas: `localStorage` (instantáneo y offline) +
   `onPersist` para guardar `User.theme` en el backend. Al loguear, el perfil
   remoto pisa al local (`initialTheme`).

```tsx
<ThemeProvider initialTheme={user.theme} onPersist={(t) => api.patch('/me', { theme: t })}>
```

**Modelo `User`:** campo `theme`, tipo `ThemeId` (`'ember' | 'voltage' |
'plasma' | 'magma' | 'pulse'`), default `'ember'`, validado con `isThemeId()`.

### Agregar una paleta nueva

1. Copiar un bloque `:root[data-theme='...']` en `themes.css` y cambiar los 6 valores.
2. Agregar la entrada en `PALETTES` (`palettes.ts`).

No hay paso 3. Ningún componente se toca.

---

## 8. Reglas de uso para las próximas fases

1. **Nada de hex sueltos en componentes.** Solo tokens/utilidades. La única
   excepción es el `ThemePicker`, que muestra las 5 paletas a la vez.
2. **El acento se usa poco.** Una sola zona de acento fuerte por pantalla: si
   todo grita, nada grita.
3. **Mínimo teclado.** Si las opciones son acotadas → `<ChoiceGroup />` (chips
   táctiles), toggles o selectores. El teclado queda para nombre, peso, texto
   de check-in, post del grupo, comentario y búsqueda de usuario. Nada más.
4. **Todo lo tocable ≥ 44px**, con `.pressable`.
5. **`.notch` con moderación:** una o dos piezas por pantalla, o deja de significar algo.
6. **La voz también es sistema:** títulos directos y en segunda persona; el
   humor va en la bajada o en el hint, nunca en botones de acción destructiva.
7. **Números siempre con `.num`.** Un número de racha en fuente de cuerpo se ve mal.
8. **Parche visible, nota del parche.** Si quien ya usa la app va a ver algo
   nuevo, hay un bloque arriba de `RELEASES` en `src/whats-new/releases.ts`.
   Sin eso, la pantalla de "hay de nuevo" no se abre. Ver §10.
9. **Si le pasa a otra persona, se avisa — o se decide que no.** Un hecho
   social (entreno, comentario, voto, solicitud) sale por `notify.ts` con
   `kind`, interruptor en Ajustes y `fireAndForget` después de responder.
   Si no debe pitar (un post de texto en el grupo, v1), eso se declara, no
   se "olvida". Ver §10.

---

## 9. Cómo se aplicó en auth + onboarding

Referencia de que el sistema aguanta pantallas reales:

- **Login:** los dos botones sociales son `Button` grandes; el email queda
  plegado detrás de un `SegmentedControl`. Solo dos campos de texto.
- **Onboarding:** 5 pasos con `ProgressBar`. Únicamente el paso 1 (nombre) y el
  3 (peso) abren teclado; horario, frecuencia y las pestañas de amigos son
  `ChoiceGroup` / `SegmentedControl`.
- **Reacción a la frecuencia:** el tono escala de neutro a `danger` reusando
  los colores de estado, así que se repinta con la paleta del usuario. El 5
  (el sweet spot) es el único que lleva `notch` + glow de `success`.
- **Ajustes:** sin botón "Guardar" — cada control persiste al tocarlo, con un
  `tape` verde de "guardado" al lado del label.
- **Amigos y grupos:** las solicitudes pendientes van arriba en `Card`
  `tone="accent"` porque son lo único que pide acción; la meta base del grupo
  y la meta personal usan el mismo `ChoiceGroup`, así que elegir "5×" se ve
  igual en el onboarding, en Ajustes y adentro del grupo.
- **Check-in:** la pantalla con menos fricción de la app. Dos campos y los dos
  opcionales — foto y comentario —, y el botón de confirmar nunca se
  deshabilita ni espera a que llenes nada. Al confirmar, la marca de "cumplido"
  entra con resorte a pantalla completa. Es la excepción declarada al principio
  de "mínimo teclado": describir un entreno es texto libre y no hay botón que
  lo reemplace, pero se puede saltear entero.
- **Grupo:** los dos modos se alternan con el mismo `SegmentedControl` del
  login y del onboarding. Los datos del grupo (código, tu meta, miembros) van
  en un panel plegado: se consultan de vez en cuando y no compiten con el
  contenido.
- **Calendario:** es del grupo, no de una persona. Un día sin check-ins se
  dibuja como texto, no como botón. La octava columna son llamas de acento:
  una por cada miembro que cumplió su meta esa semana. Tocar un día abre el
  feed de ese día.
- **Notificaciones:** el permiso del navegador nunca se pide solo — siempre
  detrás de un botón, y en iOS recién después de que la app esté instalada.
  Las instrucciones de instalación usan `Card tone="accent"` con pasos
  numerados, porque es lo único que se puede hacer cuando el sistema no ofrece
  ninguna API para instalar. Los `Switch` de qué avisos recibir aparecen recién
  con los avisos activados, y ninguno se pinta de acento: son cinco juntos y el
  acento se usa poco. Qué se manda, a quién y con qué `kind` está en §10:
  acá solo vive el permiso y los interruptores.
- **Notas del parche:** `/whats-new` se abre sola cuando el dispositivo no
  vio el último `RELEASES[0].id`. Una `Card` por parche, ícono lucide en un
  recuadro de `ink-850`, sin acento en cada fila. Desde Ajustes se puede
  volver a leer. El onboarding marca todo visto: quien entra por primera
  vez no se come el historial.
- **Ícono de la app:** disco rojo (`#EC3013`) con la marca blanca sobre
  carbón (`#201E1D`). Fuente: `public/icon-app-black.svg` y los PNG del
  mismo nombre (`icon-180`, `icon-192`, `icon-512`, …).
- **Recap:** el número grande manda (`.num` en `text-stat-xl`), la barra de
  cumplimiento cambia de color por tramos (success / warning / danger) y el
  veredicto en texto acompaña al número. Sin tarjetas de “quién la rompió”
  ni “el más huevón”: el recap cuenta el mes, no señala a nadie.
- **Modales:** siempre hoja inferior, nunca modal centrado. En una app que se
  usa con una mano, lo importante tiene que caer cerca del pulgar.

---

## 10. Al cerrar una feature: parches y avisos

Esto no es visual. Si se salta, quien ya usa la app no se entera, o se
entera por un push que no pidió. **Cerrar una feature es: código + nota del
parche + (avisar o declarar que no).**

### 11.1 Notas del parche

Catálogo: `src/whats-new/releases.ts`. Visto: `localStorage` clave
`toptraining.seenRelease` (`src/whats-new/seen.ts`). Pantalla:
`WhatsNewScreen`. Se abre sola desde `RequireAuth` si hay ids más nuevas
que la guardada.

**Cuándo sí:** cambio que se ve o se siente (pantalla, feed, voto, foto,
post, recap, aviso). Un toque, un número, un texto nuevo.

**Cuándo no:** refactor, schema interno, seed, cosa que el usuario no
puede percibir.

Pasos:

1. Copiar un bloque **arriba** de `RELEASES` (lo más nuevo primero).
2. `id` que no se haya usado. La fecha alcanza (`2026.08.27`); el mismo
   día, un sufijo (`2026.08.27-posts`).
3. Voz de producto: segunda persona, corta, sin changelog de ingeniería.
4. Ícono: uno de `ReleaseIcon`. Si hace falta uno nuevo, se agrega al
   tipo **y** al mapa `ICONS` de `WhatsNewScreen` (lucide, grosor 2.5).
5. No tocar `seen.ts`. Quien ya vio el parche anterior recibe solo los
   bloques que quedaron arriba de su id.

Quien termina el onboarding llama `markReleasesSeen()`: no hay que
“protegerlo” a mano.

### 11.2 Notificaciones

Hay dos relojes distintos:

| Origen | Archivo | Ejemplos |
|---|---|---|
| La gente | `server/src/notify.ts` | entreno, comentario, aura/laura, solicitud |
| El cron | `server/src/scheduler.ts` | recordatorio de entrenar (`nudge`) |

Los sociales se lanzan con `fireAndForget(...)` **después** de responder
el HTTP: que el push falle no puede convertir un comentario guardado en
un error en pantalla. Nadie se avisa a sí mismo. Sacar, mover o borrar
no manda nada — solo el hecho de poner.

Cada tipo tiene interruptor en el perfil y en Ajustes (`PushSettings`):

| `kind` | Campo | Cuándo |
|---|---|---|
| `nudge` | `notifyNudge` | No marcó en su ventana (job) |
| `post` | `notifyPosts` | Alguien de tus grupos marcó un **entreno** |
| `comment` | `notifyComments` | Comentaron tu entreno |
| `vote` | `notifyVotes` | Te dieron aura o laura |
| `friend` | `notifyFriends` | Te mandaron solicitud |
| `test` | — | Lo pide el usuario con un botón |

El filtro vive en `sendToUsers(userIds, payload, kind)`: **sin `kind` no
compila**, así un aviso nuevo no puede olvidarse del interruptor.

**Si la feature es un hecho que le pasa a otra persona**, o se avisa o se
escribe que no. Un post de texto en el grupo (v1) no pita: no es un
entreno y no usa `notifyPosts`. Si más adelante avisara, sería un `kind`
nuevo (o reusar uno con copy claro), columna en `User`, default `true` en
`ensure-schema.ts`, fila en Ajustes, y `fireAndForget` en el POST.

Alta de un `kind` social, en este orden:

1. `PREF_FIELD` en `push.ts` + campo `notify…` en Prisma / `ensure-schema`
   (default `true`, para no silenciar a quien ya estaba).
2. Función en `notify.ts` (título corto, `tag` que agrupe lo repetido,
   `url` a donde hay que ir).
3. `fireAndForget(...)` en el handler, **después** del `res.json`.
4. Fila en `PushSettings` (lucide, sin acento en el switch).
5. Tipo `NotifyKey` en `src/lib/api.ts`.

El permiso del navegador **nunca** se pide al abrir la app: siempre
detrás de un botón, y en iOS recién con la PWA instalada. Eso no se
toca al sumar un tipo de aviso.

---

## 11. Pendientes conocidos

- Fuente servida desde Google Fonts. Antes de la PWA offline conviene
  auto-hospedarla (`@fontsource-variable/archivo`) para no depender de la red.
- Falta el manifest + service worker de la PWA (fase de infraestructura).
- El wordmark está en `public/lockup-horizontal.svg`; todavía no se usa
  en ninguna pantalla (el login sigue siendo tipográfico).
