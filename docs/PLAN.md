# Plan: App de Gimnasio (Express + React + PostgreSQL + TypeScript + PWA)

## Contexto

Proyecto nuevo (directorio vacío). Se necesita una app de gestión de gimnasio con 3 roles (alumno, entrenador, administrador), control de acceso por QR con reglas de morosidad, rutinas personalizadas usando ejercicios de ExerciseDB (https://github.com/exercisedb/exercisedb-api), pagos de mensualidad, nómina de entrenadores por horas/alumnos, dashboard con exportación a Excel, e instalable como PWA.

Supuestos (ajustables): pasarela de pago **Mercado Pago** (Checkout Pro + webhook) además de pago manual en mesa de entrada; moneda única; un solo gimnasio (sin multi-sede).

---

## 1. Stack y dependencias

**Monorepo** con `pnpm workspaces`:

```
gym-app/
├─ apps/api        (Express)
├─ apps/web        (React + Vite + PWA)
├─ docker-compose.yml (postgres, redis, mailhog)
```

| Capa     | Herramientas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | express 5, typescript, tsx, **DTOs con validación propia** (sin librerías), **Prisma** (ORM + migraciones), jsonwebtoken + refresh tokens en cookie httpOnly, argon2 (hash), helmet, cors, express-rate-limit, pino (logs), **BullMQ + Redis** (jobs: notificaciones, vencimientos), node-cron (scheduler), **exceljs** (Excel), **pdfkit** o `@react-pdf/renderer` (descargar rutina PDF), qrcode (generar QR), mercadopago SDK, nodemailer, **web-push** (notificaciones PWA), swagger-ui-express (docs) |
| Frontend | react 19, vite, typescript, **react-router**, **@tanstack/react-query**, **react-hook-form**, **tailwindcss + shadcn/ui**, **recharts** (línea de progreso y dashboard), **@zxing/browser** o `html5-qrcode` (escaneo QR), zustand (estado de sesión), dayjs, **vite-plugin-pwa** (Workbox)                                                                                                                                                                                                                |
| Calidad  | eslint, prettier, vitest + supertest (API), vitest + testing-library (web), playwright (e2e), husky + lint-staged                                                                                                                                                                                                                                                                                                                                                                                          |

El backend sigue el patrón **DTO + Repository**: ver [ARQUITECTURA-BACKEND.md](ARQUITECTURA-BACKEND.md).

---

## 2. Modelo de datos (Prisma / PostgreSQL)

- **User**: id, email, passwordHash, firstName, lastName, phone, role (`MEMBER|TRAINER|ADMIN`), status (`ACTIVE|INACTIVE`), createdAt, deletedAt (soft delete)
- **MemberProfile**: userId, birthDate, trainerId (FK User TRAINER), qrToken (único, rotable), onboardingCompleted
- **TrainerProfile**: userId, hourlyRate, perStudentRate, specialty
- **Schedule** (horario del alumno): memberId, dayOfWeek, startTime, endTime → ABM
- **TrainerSchedule** (opcional, disponibilidad del entrenador para elegir horario compatible)
- **ProgressEntry**: memberId, date, weightKg, heightCm, age (calculada de birthDate y guardada como snapshot), notes
- **ExerciseCache**: externalId (ExerciseDB), name, gifUrl, targetMuscles, bodyParts, equipments, instructions (jsonb), fetchedAt
- **Routine**: id, name, description, trainerId, memberId, startDate, endDate, active
- **RoutineDay**: routineId, dayOfWeek/orden, title
- **RoutineExercise**: routineDayId, exerciseExternalId, sets, reps, restSec, weight, notes, order
- **RoutineCheck** (check de rutina / historial): memberId, routineDayId, routineExerciseId?, completedAt
- **MembershipPrice**: amount, validFrom, createdBy (histórico de precios)
- **Invoice / Cuota**: memberId, period (YYYY-MM), amount, dueDate, status (`PENDING|PAID|OVERDUE`), paidAt
- **Payment**: invoiceId, method (`MERCADOPAGO|CASH|TRANSFER`), externalId, amount, status, rawPayload (jsonb), registeredBy
- **AccessLog** (ingreso alumno QR): memberId, scannedAt, result (`ALLOWED|WARNED|DENIED`), reason
- **TrainerShift** (ingreso/egreso entrenador): trainerId, checkIn, checkOut, durationMinutes
- **Payroll**: trainerId, period, hoursWorked, studentsCount, hoursAmount, studentsAmount, total, status (`PENDING|PAID`), paidAt
- **Notification**: userId, type, title, body, readAt, channel
- **PushSubscription**: userId, endpoint, keys (jsonb)
- **AuditLog**: actorId, action, entity, entityId, diff (jsonb)

Índices: `Invoice(memberId, period)` único, `AccessLog(memberId, scannedAt)`, `TrainerShift(trainerId, checkIn)`.

---

## 3. Arquitectura del backend (`apps/api/src`)

```
config/        variables de entorno y reglas de negocio
db/            prisma client
middlewares/   auth (JWT), requireRole(...roles), validate({body,query,params}), errorHandler, rateLimit
modules/
  auth/        login, refresh, logout, me, forgot/reset password
  users/       ABM admin (alumnos/entrenadores), cambio de rol
  members/     onboarding, elegir/cambiar entrenador, horarios ABM, progreso, QR propio
  trainers/    lista alumnos, detalle alumno, check-in/out, salario
  exercises/   proxy + caché de ExerciseDB (búsqueda, detalle, filtros)
  routines/    CRUD (entrenador), ver/check/descargar PDF (alumno), historial
  billing/     precios, cuotas, pagos (MP + manual), webhook MP, estado de cuenta
  access/      validación QR en recepción
  payroll/     cálculo y pago de nómina
  reports/     dashboard KPIs, export Excel
  notifications/ in-app + email + web push
jobs/          generación de cuotas, aviso vencimiento, morosidad, cálculo nómina
```

Patrón por módulo: `*.routes.ts → *.controller.ts → *.service.ts → *.repository.ts → Prisma`, con DTOs en `*.dto.ts`.

### Reglas de negocio clave

1. **Cuotas**: job diario crea la cuota del mes (con el precio vigente en `MembershipPrice`) según fecha de alta del alumno; marca `OVERDUE` las vencidas.
2. **Notificaciones de vencimiento** (job diario 09:00):
   - 5 días antes del `dueDate` → "Tu cuota vence el dd/mm".
   - 1 cuota adeudada → "Adeudás 1 cuota".
   - 2+ cuotas adeudadas → "Acceso bloqueado, acercate a mesa de entrada".
   - Canales: in-app + web push + email. Idempotencia guardando `Notification(type, period)`.
3. **Acceso por QR** (`POST /access/scan`): el QR del alumno contiene un token firmado (JWT corto/rotativo, el QR en la PWA se refresca cada ~60s para evitar capturas). Recepción (tablet en modo kiosco con rol ADMIN o un rol técnico `RECEPTION` opcional) escanea → servicio cuenta cuotas impagas:
   - 0 → `ALLOWED` (+ aviso si vence en ≤5 días)
   - 1 → `WARNED` (permite ingreso, muestra adeuda)
   - ≥2 → `DENIED` ("acercarse a mesa de entrada")
     Se registra en `AccessLog`.
4. **Onboarding alumno nuevo**: guard en front y back (`onboardingCompleted=false` → solo puede acceder al wizard: elegir horario + entrenador). Puede cambiar ambos luego.
5. **Entrenador check-in/out**: un solo turno abierto por entrenador (validación); al cerrar calcula `durationMinutes`. Opcional: check-in también por QR del gimnasio.
6. **Salario entrenador**: `horas * hourlyRate + alumnosActivos * perStudentRate` (fórmula configurable). El entrenador ve su estimado del mes en curso; admin genera `Payroll` y la marca pagada.
7. **Rutinas**: el entrenador solo puede asignar a alumnos cuyo `trainerId` es él (autorización a nivel servicio). Descarga en PDF con nombre, series, reps, GIF/imagen del ejercicio.
8. **ExerciseDB**: el backend hace de proxy (`/exercises?search=&bodyPart=&equipment=`) contra la API pública de ExerciseDB y cachea en `ExerciseCache` (evita rate limits y permite PDFs/offline). Las rutinas guardan solo `externalId`.
9. **Pagos MP**: `POST /billing/invoices/:id/checkout` crea preferencia → redirect → webhook `/billing/webhooks/mercadopago` (verificación de firma) marca `PAID`. Admin puede registrar pago manual en efectivo.

---

## 4. Endpoints principales (resumen)

- **Auth**: `POST /auth/login|refresh|logout`, `GET /auth/me`
- **Alumno**: `GET /me/routines`, `GET /me/routines/:id/pdf`, `POST /me/routines/checks`, `GET /me/history`, `GET|POST /me/progress`, `GET|POST|PUT|DELETE /me/schedules`, `PUT /me/trainer`, `GET /me/invoices`, `POST /billing/invoices/:id/checkout`, `GET /me/qr`, `GET /trainers` (para elegir)
- **Entrenador**: `GET /trainer/students`, `GET /trainer/students/:id` (progreso, historial, horarios, rutinas), `POST|PUT|DELETE /trainer/routines`, `POST /trainer/shifts/check-in|check-out`, `GET /trainer/shifts`, `GET /trainer/salary?period=`
- **Admin**: `CRUD /admin/users`, `PATCH /admin/users/:id/role`, `GET /admin/members/payments-status`, `GET /admin/members/:id/account`, `POST /admin/payments/manual`, `GET|POST /admin/prices`, `GET /admin/payroll?period=`, `POST /admin/payroll/:id/pay`, `GET /admin/dashboard?from=&to=`, `GET /admin/reports/:type.xlsx?from=&to=`
- **Recepción**: `POST /access/scan`
- **Exercises**: `GET /exercises`, `GET /exercises/:id`
- **Push**: `POST /push/subscribe`, `GET /notifications`, `PATCH /notifications/:id/read`

---

## 5. Frontend (`apps/web/src`)

```
app/        router, providers (QueryClient, Auth), layouts por rol
features/   auth, onboarding, routines, progress, schedules, billing, trainer, admin, access, notifications
components/ ui (shadcn), ExerciseCard (GIF + instrucciones), Charts, DataTable
lib/        api client (fetch + refresh token), queryKeys
pwa/        registro SW, prompt de instalación, suscripción push
```

Rutas protegidas por rol (`<RequireRole roles={[...]}/>`).

**Pantallas**

- Alumno: Home (estado cuota + QR de acceso), Mis rutinas (checks por ejercicio/día, ver ejemplo ExerciseDB, descargar PDF), Historial, Progreso (recharts: peso/altura/edad en el tiempo), Horarios ABM, Elegir/cambiar entrenador, Pagos.
- Entrenador: Mis alumnos (lista + detalle), Editor de rutinas (buscador de ejercicios ExerciseDB con filtros, drag & drop de orden), Fichar ingreso/egreso, Mi salario.
- Admin: Dashboard (ingresos por mes/rango, alumnos activos, morosos, ingresos vs nómina), Estado de pagos alumnos, Estado de cuenta individual, Nómina y pago a entrenadores, Usuarios ABM + roles, Precios, Exportar reportes Excel.
- Recepción/kiosco: escáner QR a pantalla completa con resultado verde/amarillo/rojo.

---

## 6. PWA

- `vite-plugin-pwa` con `registerType: 'prompt'`, manifest (nombre, íconos 192/512/maskable, `display: standalone`, theme color, shortcuts: "Mi QR", "Mis rutinas").
- Estrategias Workbox: app shell precacheado; `NetworkFirst` para `/api/me/routines`; `CacheFirst` para GIFs de ExerciseDB; `StaleWhileRevalidate` para assets.
- **Offline**: ver rutinas y QR cacheados; los **checks de rutina offline** se encolan (Workbox Background Sync o cola en IndexedDB con `idb-keyval`) y se sincronizan al reconectar.
- **Web Push** (VAPID, librería `web-push`) para avisos de vencimiento/morosidad y nuevas rutinas asignadas.
- Prompt de instalación custom (`beforeinstallprompt`) y aviso de nueva versión.
- Cámara para escaneo QR funciona en la PWA (requiere HTTPS).

---

## 7. Seguridad

- Access token corto (15 min) + refresh token rotativo en cookie httpOnly/SameSite.
- RBAC en middleware + verificación de pertenencia (entrenador ↔ alumno) en servicios.
- Validación de todo input con DTOs; rate limit en login y scan.
- Webhook MP con validación de firma `x-signature`.
- AuditLog en acciones admin (ABM usuarios, roles, precios, pagos).

---

## 8. Fases de implementación

1. **Setup**: monorepo, docker-compose (Postgres, Redis, Mailhog), eslint/prettier, Prisma schema + seed (admin, 2 entrenadores, alumnos, precios).
2. **Auth + RBAC + ABM usuarios** (admin) + layouts por rol en el front.
3. **Onboarding alumno**: horarios ABM, elegir/cambiar entrenador.
4. **ExerciseDB proxy/caché + rutinas**: editor del entrenador, vista/check del alumno, historial, PDF.
5. **Progreso** (registro + gráfico).
6. **Billing**: precios, generación de cuotas, Mercado Pago + pago manual, estado de cuenta.
7. **Acceso QR + reglas de morosidad + notificaciones** (jobs BullMQ, email, in-app).
8. **Entrenador**: fichaje ingreso/egreso, salario; **Admin**: nómina y pago.
9. **Dashboard + exportes Excel**.
10. **PWA**: manifest, service worker, offline, background sync, web push.
11. **Tests e2e, Swagger, CI (GitHub Actions), deploy** (API + Postgres en Railway/Render/Fly; web en Vercel/Netlify; HTTPS obligatorio para PWA y cámara).

---

## 9. Verificación

- `docker compose up -d` + `pnpm prisma migrate dev && pnpm seed` + `pnpm dev` (api y web).
- Tests unitarios (vitest) de reglas críticas: conteo de cuotas adeudadas → ALLOWED/WARNED/DENIED, aviso a 5 días, cálculo de salario, turno abierto único.
- Tests de integración (supertest) por endpoint con RBAC (403 para rol incorrecto, entrenador no puede tocar alumnos ajenos).
- Webhook MP probado con sandbox de Mercado Pago + ngrok.
- E2E Playwright: alumno nuevo → onboarding → paga → ve rutina → check → recepción escanea QR; escenario con 2 cuotas impagas → acceso denegado.
- Lighthouse (PWA instalable, offline), prueba de push en Chrome/Android.
- Exportar Excel del dashboard y abrirlo para validar columnas/totales.
