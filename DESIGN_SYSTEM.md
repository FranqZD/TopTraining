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
src/showcase/           ← pantalla de referencia visual (no es producto)
```

Ver el sistema andando: `npm run dev`.

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
   de check-in, comentario y búsqueda de usuario. Nada más.
4. **Todo lo tocable ≥ 44px**, con `.pressable`.
5. **`.notch` con moderación:** una o dos piezas por pantalla, o deja de significar algo.
6. **La voz también es sistema:** títulos directos y en segunda persona; el
   humor va en la bajada o en el hint, nunca en botones de acción destructiva.
7. **Números siempre con `.num`.** Un número de racha en fuente de cuerpo se ve mal.

---

## 9. Pendientes conocidos

- Fuente servida desde Google Fonts. Antes de la PWA offline conviene
  auto-hospedarla (`@fontsource-variable/archivo`) para no depender de la red.
- Falta el manifest + service worker de la PWA (fase de infraestructura).
- Falta definir el wordmark/logo como pieza gráfica; hoy el logotipo es
  tipográfico (Archivo Expanded 120, caja alta).
