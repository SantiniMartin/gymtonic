# Backlog del backend

Tareas del backend de Gym Tonic organizadas por fase. Cada tarea es un issue de GitHub con su descripción, endpoints, tareas y criterios de aceptación; cada fase es un milestone.

- Rama base de trabajo: `develop`
- Plan completo: [PLAN.md](PLAN.md)
- Issues: https://github.com/SantiniMartin/gymtonic/issues?q=label%3Abackend

## Flujo de trabajo

1. Crear una rama desde `develop` con el número del issue: `feature/<n>-descripcion-corta` (por ejemplo `feature/3-auth-jwt`).
2. Abrir el PR hacia `develop` con `Closes #<n>` en la descripción.
3. Cuando una fase está completa, mergear `develop` en `main`.

## Fase 1 · Setup

Monorepo, Docker Compose, tooling, schema Prisma y seed.

| Issue                                                    | Tarea                                       | Labels                       | Estado   |
| -------------------------------------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| [#2](https://github.com/SantiniMartin/gymtonic/issues/2) | Setup del monorepo, schema de Prisma y seed | `backend` `database` `infra` | ✅ Hecho |

## Fase 2 · Auth, RBAC y usuarios

Login, tokens, roles y ABM de usuarios.

| Issue                                                    | Tarea                                      | Labels                         | Estado       |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------ | ------------ |
| [#3](https://github.com/SantiniMartin/gymtonic/issues/3) | Autenticación con JWT y refresh tokens     | `backend` `auth`               | ⬜ Pendiente |
| [#4](https://github.com/SantiniMartin/gymtonic/issues/4) | Middlewares de autenticación y RBAC        | `backend` `auth`               | ⬜ Pendiente |
| [#5](https://github.com/SantiniMartin/gymtonic/issues/5) | Recuperación y cambio de contraseña        | `backend` `auth` `integración` | ⬜ Pendiente |
| [#6](https://github.com/SantiniMartin/gymtonic/issues/6) | ABM de usuarios y gestión de roles (admin) | `backend` `admin` `auth`       | ⬜ Pendiente |
| [#7](https://github.com/SantiniMartin/gymtonic/issues/7) | Auditoría de acciones administrativas      | `backend` `admin`              | ⬜ Pendiente |

## Fase 3 · Onboarding del alumno

Horarios ABM y elección de entrenador.

| Issue                                                      | Tarea                                          | Labels                          | Estado       |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------- | ------------ |
| [#8](https://github.com/SantiniMartin/gymtonic/issues/8)   | Onboarding del alumno nuevo                    | `backend` `alumno`              | ⬜ Pendiente |
| [#9](https://github.com/SantiniMartin/gymtonic/issues/9)   | ABM de horarios del alumno                     | `backend` `alumno`              | ⬜ Pendiente |
| [#10](https://github.com/SantiniMartin/gymtonic/issues/10) | Listado de entrenadores y cambio de entrenador | `backend` `alumno` `entrenador` | ⬜ Pendiente |

## Fase 4 · ExerciseDB y rutinas

Proxy/caché de ExerciseDB, rutinas, checks, historial y PDF.

| Issue                                                      | Tarea                                       | Labels                  | Estado       |
| ---------------------------------------------------------- | ------------------------------------------- | ----------------------- | ------------ |
| [#11](https://github.com/SantiniMartin/gymtonic/issues/11) | Proxy y caché de ExerciseDB                 | `backend` `integración` | ⬜ Pendiente |
| [#12](https://github.com/SantiniMartin/gymtonic/issues/12) | CRUD de rutinas personalizadas (entrenador) | `backend` `entrenador`  | ⬜ Pendiente |
| [#13](https://github.com/SantiniMartin/gymtonic/issues/13) | Rutinas del alumno: ver, check e historial  | `backend` `alumno`      | ⬜ Pendiente |
| [#14](https://github.com/SantiniMartin/gymtonic/issues/14) | Descargar rutina en PDF                     | `backend` `alumno`      | ⬜ Pendiente |
| [#15](https://github.com/SantiniMartin/gymtonic/issues/15) | Lista y detalle de alumnos del entrenador   | `backend` `entrenador`  | ⬜ Pendiente |

## Fase 5 · Progreso

Línea de progreso del alumno (peso, edad, altura).

| Issue                                                      | Tarea                        | Labels             | Estado       |
| ---------------------------------------------------------- | ---------------------------- | ------------------ | ------------ |
| [#16](https://github.com/SantiniMartin/gymtonic/issues/16) | Línea de progreso del alumno | `backend` `alumno` | ⬜ Pendiente |

## Fase 6 · Facturación y pagos

Precios, cuotas, Mercado Pago, pago manual y estado de cuenta.

| Issue                                                      | Tarea                                                 | Labels                                   | Estado       |
| ---------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------------ |
| [#17](https://github.com/SantiniMartin/gymtonic/issues/17) | Precios de la mensualidad                             | `backend` `admin` `pagos`                | ⬜ Pendiente |
| [#18](https://github.com/SantiniMartin/gymtonic/issues/18) | Generación de cuotas y vencimientos (job)             | `backend` `pagos` `jobs`                 | ⬜ Pendiente |
| [#19](https://github.com/SantiniMartin/gymtonic/issues/19) | Pago de mensualidad con Mercado Pago                  | `backend` `alumno` `pagos` `integración` | ⬜ Pendiente |
| [#20](https://github.com/SantiniMartin/gymtonic/issues/20) | Registro de pago manual en mesa de entrada            | `backend` `admin` `pagos`                | ⬜ Pendiente |
| [#21](https://github.com/SantiniMartin/gymtonic/issues/21) | Estado de cuenta y estado de pagos de alumnos (admin) | `backend` `admin` `pagos`                | ⬜ Pendiente |

## Fase 7 · Acceso QR y notificaciones

Ingreso por QR con reglas de morosidad y avisos.

| Issue                                                      | Tarea                                            | Labels                    | Estado       |
| ---------------------------------------------------------- | ------------------------------------------------ | ------------------------- | ------------ |
| [#22](https://github.com/SantiniMartin/gymtonic/issues/22) | QR rotativo del alumno                           | `backend` `alumno` `auth` | ⬜ Pendiente |
| [#23](https://github.com/SantiniMartin/gymtonic/issues/23) | Control de acceso por QR con reglas de morosidad | `backend` `admin` `pagos` | ⬜ Pendiente |
| [#24](https://github.com/SantiniMartin/gymtonic/issues/24) | Servicio de notificaciones (in-app y email)      | `backend` `integración`   | ⬜ Pendiente |
| [#25](https://github.com/SantiniMartin/gymtonic/issues/25) | Job de avisos de vencimiento y morosidad         | `backend` `jobs` `pagos`  | ⬜ Pendiente |

## Fase 8 · Fichaje y nómina

Ingreso/egreso de entrenadores, salario y pago de nómina.

| Issue                                                      | Tarea                                       | Labels                         | Estado       |
| ---------------------------------------------------------- | ------------------------------------------- | ------------------------------ | ------------ |
| [#26](https://github.com/SantiniMartin/gymtonic/issues/26) | Registro de ingreso y egreso del entrenador | `backend` `entrenador`         | ⬜ Pendiente |
| [#27](https://github.com/SantiniMartin/gymtonic/issues/27) | Salario del entrenador                      | `backend` `entrenador` `pagos` | ⬜ Pendiente |
| [#28](https://github.com/SantiniMartin/gymtonic/issues/28) | Nómina y pago a entrenadores (admin)        | `backend` `admin` `pagos`      | ⬜ Pendiente |

## Fase 9 · Dashboard y reportes

KPIs del gimnasio y exportación a Excel.

| Issue                                                      | Tarea                                 | Labels            | Estado       |
| ---------------------------------------------------------- | ------------------------------------- | ----------------- | ------------ |
| [#29](https://github.com/SantiniMartin/gymtonic/issues/29) | Dashboard de rendimiento del gimnasio | `backend` `admin` | ⬜ Pendiente |
| [#30](https://github.com/SantiniMartin/gymtonic/issues/30) | Exportación de reportes a Excel       | `backend` `admin` | ⬜ Pendiente |

## Fase 10 · PWA (backend)

Web Push y soporte offline del lado de la API.

| Issue                                                      | Tarea                             | Labels                  | Estado       |
| ---------------------------------------------------------- | --------------------------------- | ----------------------- | ------------ |
| [#31](https://github.com/SantiniMartin/gymtonic/issues/31) | Web Push para la PWA              | `backend` `integración` | ⬜ Pendiente |
| [#32](https://github.com/SantiniMartin/gymtonic/issues/32) | Soporte de sincronización offline | `backend`               | ⬜ Pendiente |

## Fase 11 · Calidad y deploy

Swagger, tests, CI y despliegue.

| Issue                                                      | Tarea                                  | Labels              | Estado       |
| ---------------------------------------------------------- | -------------------------------------- | ------------------- | ------------ |
| [#33](https://github.com/SantiniMartin/gymtonic/issues/33) | Documentación OpenAPI / Swagger        | `backend` `infra`   | ⬜ Pendiente |
| [#34](https://github.com/SantiniMartin/gymtonic/issues/34) | Tests de integración con base de datos | `backend` `testing` | ⬜ Pendiente |
| [#35](https://github.com/SantiniMartin/gymtonic/issues/35) | CI con GitHub Actions                  | `backend` `infra`   | ⬜ Pendiente |
| [#36](https://github.com/SantiniMartin/gymtonic/issues/36) | Deploy de la API y la base de datos    | `backend` `infra`   | ⬜ Pendiente |
