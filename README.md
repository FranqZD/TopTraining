# Top Training

PWA social de fitness: grupos de amigos que se presionan mutuamente para
cumplir metas de entrenamiento antes de un viaje.

- **Diseño e identidad de marca:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

## Stack

| Capa | Qué usa |
|---|---|
| Frontend | Vite · React 19 · TypeScript · Tailwind v4 (CSS-first) · react-router · motion · lucide |
| Backend | Express 5 · better-auth · Prisma 7 (SQLite en dev) · zod |
| Fotos | Cloudinary (subida firmada directa desde el navegador) |
| Auth | Google OAuth · Apple OAuth · email + contraseña (argon2id) |

## Arranque

```bash
npm run setup   # instala front y back, y crea la base SQLite
npm run dev     # web en :5173 + api en :8787
```

`npm run dev` levanta las dos cosas. El frontend habla con el API por el proxy
de Vite (`/api` → `:8787`), así que en desarrollo todo es el mismo origen y la
cookie de sesión no necesita CORS.

Con esto ya podés registrarte con email y contraseña. Google y Apple aparecen
en la pantalla de login marcados como "sin configurar" hasta que cargues las
credenciales.

## OAuth (opcional en dev)

Copiá `server/.env.example` a `server/.env` y completá lo que vayas a usar.
El servidor solo registra los proveedores que tienen credenciales, y expone en
`GET /api/config` cuáles están activos para que el login no muestre botones
que van a fallar.

- **Google:** Google Cloud Console → Credenciales → ID de cliente OAuth (app web).
  Redirect URI: `http://localhost:8787/api/auth/callback/google`
- **Apple:** requiere Apple Developer Program (de pago). El `client secret` es
  un JWT firmado con la clave `.p8` y caduca a los 6 meses.
  Redirect URI: `http://localhost:8787/api/auth/callback/apple`

## Sesión

Cookie `HttpOnly`, `SameSite=Lax`, 60 días, que se renueva sola una vez por día
de uso. Es una app de uso diario: nadie debería volver a ver el login.

## API

| Método | Ruta | Qué hace |
|---|---|---|
| `ALL` | `/api/auth/*` | better-auth (registro, login, OAuth, logout) |
| `GET` | `/api/config` | proveedores sociales activos |
| `GET` `PATCH` | `/api/me` | perfil (nombre, horario, peso, frecuencia, tema) |
| `GET` | `/api/friends` | amigos con su racha ya calculada |
| `GET` | `/api/friends/requests` | bandeja: recibidas y enviadas |
| `POST` | `/api/friends/request` | mandar solicitud (por `code` o por `userId`) |
| `POST` | `/api/friends/requests/:id/accept` · `/decline` | responder una solicitud |
| `GET` | `/api/users/search?q=` | buscar por nombre o código (con estado de la relación) |
| `GET` `POST` | `/api/groups` | listar / crear grupo |
| `POST` | `/api/groups/join` | sumarse con el código del grupo |
| `GET` | `/api/groups/:id` | detalle con miembros y metas efectivas |
| `PATCH` | `/api/groups/:id/me` | tu meta personal (`null` = heredar la del grupo) |
| `POST` | `/api/uploads/checkin-signature` | firma para subir la foto a Cloudinary |
| `POST` | `/api/checkins` | marcar el día (409 si ya marcó) |
| `GET` | `/api/checkins/latest` | último check-in propio o `?userId=` de un amigo |
| `GET` | `/api/checkins` | tus últimos 60 días |
| `GET` | `/api/checkins/:id` | detalle con comentarios (miembros del mismo grupo) |
| `POST` | `/api/checkins/:id/comments` | comentar el entrenamiento de otro |
| `GET` | `/api/groups/:id/feed` | feed paginado por cursor (`?cursor=&limit=`) |
| `GET` | `/api/groups/:id/calendar` | grilla mensual de un miembro (`?userId=&month=`) |

Todo lo que no sea `/api/auth/*` exige sesión y valida el cuerpo con zod.

## Estructura

```
src/
  components/ui/     sistema de diseño (Fase 1)
  screens/           login · onboarding · settings · home
  theme/             paletas + ThemeProvider
  profile/           perfil del usuario logueado
  lib/               cliente HTTP y cliente de auth
server/
  src/auth.ts        configuración de better-auth
  src/index.ts       API Express
  prisma/schema.prisma
```

## Rutas

| Ruta | |
|---|---|
| `/login` | registro y acceso |
| `/onboarding` | 5 pasos, solo la primera vez |
| `/` | home: check-in del día (placeholder), grupos y acceso a amigos |
| `/checkin` | marcar el entrenamiento del día |
| `/groups/:id` | grupo, con toggle Feed / Calendario |
| `/friends` | solicitudes, lista de amigos y alta por código o búsqueda |
| `/groups/new` · `/groups/join` · `/groups/:id` | crear, unirse, detalle |
| `/settings` | ajustes y paleta |
| `/design` | muestrario del sistema de diseño |

## Fotos de check-in (Cloudinary)

Elegí Cloudinary sobre S3 porque no hay que crear bucket, política IAM ni
configurar CORS: con tres variables de entorno ya sube, y encima sirve las
imágenes optimizadas desde su CDN.

Cargá `CLOUDINARY_*` en `server/.env` (ver `.env.example`). **Sin esas
variables el check-in funciona igual, solo que sin foto**: el servidor lo
informa en `GET /api/config` y la pantalla esconde la sección.

El navegador sube **directo a Cloudinary** con una firma que emite el servidor,
así los bytes no pasan por nuestro API y la clave secreta nunca sale de él.
Tres detalles que hacen que esto sea seguro y prolijo:

- El `public_id` lo fija el servidor (`<userId>_<día>`) y va **dentro de la
  firma**: nadie puede subir con un nombre arbitrario ni pisar la foto de otro.
- Como el nombre es determinístico, rehacer la foto del mismo día sobreescribe
  en vez de dejar archivos huérfanos.
- La URL que devuelve el cliente se valida contra nuestra cuenta y carpeta
  antes de guardarla, así no se puede colar un link a un servidor ajeno.

La foto se redimensiona a 1600px y se recomprime en el teléfono antes de
subir: una foto de cámara pesa 4–8 MB y con datos móviles eso es la diferencia
entre un check-in de dos segundos y uno que se abandona a la mitad.

## Check-in

Uno por día y por usuario, garantizado por el índice único `(userId, day)`.
El día lo manda el cliente en formato `YYYY-MM-DD` porque lo que importa es su
día local, no la zona horaria del servidor.

Si ya marcó, `POST /api/checkins` responde **409 con el check-in existente**
en vez de pisarlo, y la UI muestra "ya entrenaste hoy".

`GET /api/checkins/latest` es la consulta que se va a reusar en varias
pantallas. Se apoya en ese mismo índice único: `SEARCH checkin USING INDEX
checkin_userId_day_key (userId=?)`, sin recorrer la tabla y sin paso de
ordenamiento, porque el índice ya viene ordenado por día.

## Rachas

No se guardan en ninguna tabla: se **calculan** a partir de los check-ins, así
nunca quedan desincronizadas de la realidad. Viven en
[`server/src/streaks.ts`](server/src/streaks.ts) como funciones puras sobre
días `YYYY-MM-DD` — comparar strings de fecha es exacto y no se rompe con el
horario de verano. Tienen tests: `npm --prefix server run test:streaks`.

- **Racha diaria:** días consecutivos con check-in. Si todavía no marcaste hoy
  la racha *no* está rota: cuenta desde ayer. Perderla por no haber entrenado
  a las 9 de la mañana sería una crueldad innecesaria.
- **Racha semanal:** semanas consecutivas (lunes a domingo) cumpliendo la meta.
  La semana en curso solo suma si ya la cumpliste; si te falta, no rompe nada,
  porque la semana no terminó.

En el calendario, cada semana tiene un estado explícito — `met`, `missed`,
`current` o `future` — para no clavarle una equis a una semana que todavía
está corriendo.

La meta que se usa depende del contexto: en la lista de amigos es la
`weeklyFrequency` del perfil; en el calendario de un grupo es la meta efectiva
de ese miembro en ese grupo (`personalGoal ?? baseGoal`).

## Modelo de amistad

Una sola fila por par, con dirección: `requester` → `addressee`, y `status`
`pending` → `accepted`. Son amigos recién cuando el destinatario acepta.
Si A le manda solicitud a B cuando B ya le había mandado una, se acepta sola:
hacerlo ir a la bandeja a confirmar lo que acaba de pedir sería marearlo.
Rechazar borra la fila, así el otro puede volver a intentarlo más adelante.

## Metas de grupo

El grupo tiene una `baseGoal` (3, 4 o 5 por semana). Cada miembro puede fijar
un `personalGoal` que la pisa; si no lo hace, hereda la del grupo. La meta que
manda es siempre `personalGoal ?? baseGoal`, y el API la devuelve ya resuelta
como `effectiveGoal` para que ninguna pantalla tenga que calcularla.

## Estado

Hecho: sistema de diseño, autenticación, onboarding, ajustes, amigos, grupos,
check-in diario con foto, feed de grupo, calendario, comentarios y rachas.
Pendiente: recap, manifest + service worker de la PWA, y auto-hospedar la
tipografía.

Para tener datos con los que mirar el feed y el calendario:
`npm --prefix server run db:seed` (llena de check-ins a los usuarios que ya
existan, con cadencias distintas para que las rachas no den todas lo mismo).
