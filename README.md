# Gym Tonic

App de gestión de gimnasio con tres roles (alumno, entrenador y administrador): rutinas con ejercicios de [ExerciseDB](https://github.com/exercisedb/exercisedb-api), pago de mensualidades, acceso por QR con control de morosidad, nómina de entrenadores, dashboard con exportación a Excel y soporte PWA.

El plan completo está en [`docs/PLAN.md`](docs/PLAN.md) y las tareas del backend (issues por fase) en [`docs/BACKLOG-BACKEND.md`](docs/BACKLOG-BACKEND.md).

Ramas: `main` (estable) y `develop` (integración). Las tareas se trabajan en `feature/<issue>-descripcion` desde `develop`.

## Stack

- **API**: Express 5 · TypeScript · Prisma 6 · PostgreSQL · zod · pino
- **Web**: React 19 · Vite · Tailwind CSS 4 · React Router · TanStack Query
- **Compartido**: `@gymtonic/shared` (enums, reglas de negocio y schemas zod usados en API y Web)
- **Infra local**: Docker Compose (PostgreSQL, Redis, Mailhog)

## Estructura

```
apps/
  api/       API REST (Express + Prisma)
    prisma/  schema, migraciones y seed
  web/       Frontend (React + Vite)
packages/
  shared/    Enums y schemas zod compartidos
docs/        Plan del proyecto
```

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable`)
- Docker (para PostgreSQL, Redis y Mailhog)

## Puesta en marcha

```bash
pnpm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm db:up
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

```bash
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api (salud: `/api/health` y `/api/health/ready`)
- Mailhog (emails de desarrollo): http://localhost:8025

## Usuarios de prueba (seed)

Contraseña de todos: `Gymtonic123`

| Email                          | Rol           | Situación                               |
| ------------------------------ | ------------- | --------------------------------------- |
| admin@gymtonic.local           | Administrador | —                                       |
| laura.gomez@gymtonic.local     | Entrenador    | Alumnos: Juan, Sofía                    |
| diego.ruiz@gymtonic.local      | Entrenador    | Alumnos: Martín, Carla                  |
| juan.perez@gymtonic.local      | Alumno        | Al día                                  |
| sofia.lopez@gymtonic.local     | Alumno        | Cuota vence en 3 días (aviso)           |
| martin.diaz@gymtonic.local     | Alumno        | Adeuda 1 cuota (ingresa con aviso)      |
| carla.fernandez@gymtonic.local | Alumno        | Adeuda 2 cuotas (acceso denegado)       |
| nuevo.alumno@gymtonic.local    | Alumno        | Nuevo: debe elegir horario y entrenador |

## Scripts

| Comando                     | Descripción                           |
| --------------------------- | ------------------------------------- |
| `pnpm dev`                  | API y Web en modo desarrollo          |
| `pnpm build`                | Build de todos los paquetes           |
| `pnpm typecheck`            | Chequeo de tipos                      |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                     |
| `pnpm test`                 | Tests (Vitest + Supertest)            |
| `pnpm db:migrate`           | Crear o aplicar migraciones           |
| `pnpm db:seed`              | Reiniciar la base con datos de prueba |
| `pnpm db:studio`            | Prisma Studio                         |

## Avance

- [x] Fase 1: monorepo, Docker Compose, ESLint/Prettier, schema de Prisma y seed
- [ ] Fase 2: auth, RBAC y ABM de usuarios
- [ ] Fase 3: onboarding del alumno (horarios y entrenador)
- [ ] Fase 4: ExerciseDB y rutinas
- [ ] Fase 5: progreso
- [ ] Fase 6: facturación y pagos
- [ ] Fase 7: acceso por QR y notificaciones
- [ ] Fase 8: fichaje y nómina de entrenadores
- [ ] Fase 9: dashboard y exportación a Excel
- [ ] Fase 10: PWA
- [ ] Fase 11: tests e2e, Swagger, CI y deploy
