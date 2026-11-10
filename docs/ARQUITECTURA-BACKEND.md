# Arquitectura del backend

Guía para trabajar en `apps/api`. El backend usa dos patrones:

- **DTO** (Data Transfer Object): clases que definen qué datos **entran** a la API (y los validan) y qué datos **salen** de ella.
- **Repository**: clases que concentran todas las consultas a la base de datos de un módulo.

No usamos librerías de validación: cada DTO valida sus datos con `if` simples y las funciones de [`src/lib/validators.ts`](../apps/api/src/lib/validators.ts).

El módulo de referencia es [`src/modules/trainers`](../apps/api/src/modules/trainers). Ante la duda, copiá cómo está hecho ahí.

## Cómo viaja un request

```
GET /api/trainers?page=2
        │
        ▼
 trainers.routes.ts       define la URL y qué método del controller se ejecuta
        │
        ▼
 trainers.controller.ts   1. arma el DTO de entrada desde req   (si es inválido → 400)
                          2. llama al servicio
                          3. responde con res.json(...)
        │
        ▼
 trainers.service.ts      reglas de negocio (ej: "si no existe → 404")
        │
        ▼
 trainers.repository.ts   consultas con Prisma
        │
        ▼
     PostgreSQL
```

De vuelta, el servicio convierte lo que devuelve el repository en un **DTO de salida** antes de devolverlo.

## Estructura de carpetas

```
apps/api/src/
├─ config/
│  ├─ env.ts                variables de entorno
│  └─ business-rules.ts     constantes del negocio (días de aviso, cuotas para bloquear acceso)
├─ db/prisma.ts             cliente de Prisma (lo usan solo los repositories)
├─ lib/
│  ├─ http-error.ts         errores HTTP (400, 401, 403, 404, 409)
│  ├─ validators.ts         isEmail, isUuid, isTime, isOneOf, toInt...
│  ├─ pagination.ts         PaginationDto y PaginatedResponseDto
│  └─ logger.ts
├─ middlewares/             errorHandler (y más adelante requireAuth, requireRole)
├─ modules/
│  └─ trainers/
│     ├─ trainers.dto.ts         DTOs de entrada y de salida
│     ├─ trainers.repository.ts  consultas a la base
│     ├─ trainers.service.ts     lógica de negocio
│     ├─ trainers.controller.ts  req/res
│     └─ trainers.routes.ts      URLs
├─ routes.ts                registra los routers de cada módulo
├─ app.ts                   configuración de Express
└─ server.ts                arranque
test/                       tests (vitest + supertest)
```

## Qué puede hacer cada capa

| Capa       | Puede usar                       | No puede usar                           |
| ---------- | -------------------------------- | --------------------------------------- |
| routes     | el controller                    | servicios, repositories, Prisma         |
| controller | DTOs, el servicio, `req` y `res` | Prisma, repositories, reglas de negocio |
| service    | DTOs, repositories, `HttpError`  | `req`, `res`, Prisma directamente       |
| repository | Prisma                           | `HttpError`, `req`, `res`               |
| DTO        | `validators`, `HttpError`        | Prisma, repositories, servicios         |

Regla corta: **solo los repositories importan `prisma`** y **solo los controllers tocan `req` y `res`**.

---

## Crear un módulo nuevo, paso a paso

Ejemplo: **horarios del alumno** (issue #9). Endpoints:

- `GET /api/me/schedules`: listar mis horarios
- `POST /api/me/schedules`: crear un horario

### 1. DTOs (`schedules.dto.ts`)

Un DTO de **entrada** es una clase con un método estático que recibe el dato crudo (`req.body`, `req.query` o `req.params`), lo valida y devuelve una instancia. Si algo está mal, junta **todos** los errores y lanza `HttpError.validation(errores)`, que la API responde como 400.

Un DTO de **salida** es una clase con un método estático `fromEntity()` que convierte lo que viene de la base en lo que se devuelve al cliente.

```ts
import type { Schedule } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import { isDayOfWeek, isTime } from '../../lib/validators.js';

// ── Entrada ──
export class CreateScheduleDto {
  constructor(
    public readonly dayOfWeek: number,
    public readonly startTime: string,
    public readonly endTime: string,
  ) {}

  static fromBody(body: any): CreateScheduleDto {
    const errors: string[] = [];

    if (!isDayOfWeek(body?.dayOfWeek)) errors.push('dayOfWeek: debe ser un número del 0 al 6');
    if (!isTime(body?.startTime)) errors.push('startTime: formato HH:mm');
    if (!isTime(body?.endTime)) errors.push('endTime: formato HH:mm');
    if (errors.length === 0 && body.startTime >= body.endTime) {
      errors.push('endTime: debe ser posterior a startTime');
    }

    if (errors.length > 0) throw HttpError.validation(errors);
    return new CreateScheduleDto(body.dayOfWeek, body.startTime, body.endTime);
  }
}

// ── Salida ──
export class ScheduleResponseDto {
  constructor(
    public readonly id: string,
    public readonly dayOfWeek: number,
    public readonly startTime: string,
    public readonly endTime: string,
  ) {}

  static fromEntity(s: Schedule): ScheduleResponseDto {
    return new ScheduleResponseDto(s.id, s.dayOfWeek, s.startTime, s.endTime);
  }
}
```

Reglas de los DTOs:

- Nombres: `CreateXDto`, `UpdateXDto`, `ListXQueryDto`, `XIdParamsDto` para entrada; `XResponseDto` para salida.
- Métodos: `fromBody(req.body)`, `fromQuery(req.query)`, `fromParams(req.params)` y `fromEntity(entidad)`.
- Normalizá los datos al crear el DTO (por ejemplo `email.trim().toLowerCase()`).
- **Nunca** pongas en un DTO de salida `passwordHash`, `deletedAt` ni datos de otro usuario que no correspondan.
- Los campos `Decimal` de Prisma (precios, cuotas, salarios, peso) se convierten con `.toNumber()` en `fromEntity`.
- Las fechas se devuelven como texto: `fecha.toISOString()`.

### 2. Repository (`schedules.repository.ts`)

Una clase con un método por consulta que necesite el negocio. Al final del archivo se exporta **una instancia** lista para usar.

```ts
import type { Schedule } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export class ScheduleRepository {
  findByMember(memberId: string): Promise<Schedule[]> {
    return prisma.schedule.findMany({
      where: { memberId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  findOverlapping(memberId: string, dayOfWeek: number, startTime: string, endTime: string) {
    return prisma.schedule.findFirst({
      where: { memberId, dayOfWeek, startTime: { lt: endTime }, endTime: { gt: startTime } },
    });
  }

  create(memberId: string, data: { dayOfWeek: number; startTime: string; endTime: string }) {
    return prisma.schedule.create({ data: { memberId, ...data } });
  }
}

export const scheduleRepository = new ScheduleRepository();
```

Reglas de los repositories:

- Los métodos describen **qué** se busca: `findByMember`, `findOverlapping`, `countUnpaidByMember`.
- Si algo no existe, devolvé `null`. **No** lances errores HTTP: eso lo decide el servicio.
- Filtros que siempre aplican (como `deletedAt: null`) van dentro del repository, así no se olvidan.

### 3. Service (`schedules.service.ts`)

Recibe DTOs de entrada, aplica las reglas de negocio, usa el repository y devuelve DTOs de salida.

```ts
import { HttpError } from '../../lib/http-error.js';
import { CreateScheduleDto, ScheduleResponseDto } from './schedules.dto.js';
import { scheduleRepository } from './schedules.repository.js';

export class ScheduleService {
  async listMine(memberId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await scheduleRepository.findByMember(memberId);
    return schedules.map(ScheduleResponseDto.fromEntity);
  }

  async create(memberId: string, dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    const overlap = await scheduleRepository.findOverlapping(
      memberId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );
    if (overlap) throw HttpError.conflict('El horario se superpone con otro del mismo día');

    const schedule = await scheduleRepository.create(memberId, dto);
    return ScheduleResponseDto.fromEntity(schedule);
  }
}

export const scheduleService = new ScheduleService();
```

¿Dónde va cada validación?

- **Formato** (¿es un email?, ¿la hora es HH:mm?) → en el **DTO**.
- **Negocio** (¿ya existe el email?, ¿se superpone el horario?, ¿el alumno es de este entrenador?) → en el **service**.

### 4. Controller (`schedules.controller.ts`)

Los métodos se escriben como **arrow functions** (`list = async (...) => {}`) para no perder el `this`. No hace falta `try/catch`: Express 5 manda los errores al `errorHandler` automáticamente.

```ts
import type { Request, Response } from 'express';
import { CreateScheduleDto } from './schedules.dto.js';
import { scheduleService } from './schedules.service.js';

export class ScheduleController {
  list = async (req: Request, res: Response) => {
    const schedules = await scheduleService.listMine(req.user!.id);
    res.json(schedules);
  };

  create = async (req: Request, res: Response) => {
    const dto = CreateScheduleDto.fromBody(req.body);
    const schedule = await scheduleService.create(req.user!.id, dto);
    res.status(201).json(schedule);
  };
}

export const scheduleController = new ScheduleController();
```

`req.user` va a existir cuando esté hecha la autenticación (issue #4).

### 5. Routes (`schedules.routes.ts`)

```ts
import { Router } from 'express';
import { scheduleController } from './schedules.controller.js';

export const schedulesRouter = Router();

schedulesRouter.get('/', scheduleController.list);
schedulesRouter.post('/', scheduleController.create);
```

### 6. Registrar el router en `src/routes.ts`

```ts
apiRouter.use('/me/schedules', schedulesRouter);
```

### 7. Tests (`test/schedules.*.test.ts`)

- **DTO**: probá datos válidos, datos inválidos y que junte todos los errores. Ver [`test/trainers.dto.test.ts`](../apps/api/test/trainers.dto.test.ts).
- **Service**: reemplazá el repository con `vi.mock` para probar la lógica sin base de datos. Ver [`test/trainers.service.test.ts`](../apps/api/test/trainers.service.test.ts).

```ts
vi.mock('../src/modules/schedules/schedules.repository.js', () => ({
  scheduleRepository: { findByMember: vi.fn(), findOverlapping: vi.fn(), create: vi.fn() },
}));

it('rechaza horarios superpuestos', async () => {
  vi.mocked(scheduleRepository.findOverlapping).mockResolvedValue({ id: 'x' } as never);
  const dto = CreateScheduleDto.fromBody({ dayOfWeek: 1, startTime: '08:00', endTime: '09:00' });
  await expect(scheduleService.create('member-id', dto)).rejects.toMatchObject({ status: 409 });
});
```

## Checklist para un módulo nuevo

- [ ] `x.dto.ts` con DTOs de entrada (`fromBody` / `fromQuery` / `fromParams`) y de salida (`fromEntity`)
- [ ] `x.repository.ts` con la clase y `export const xRepository = new XRepository()`
- [ ] `x.service.ts` con la clase y `export const xService = new XService()`
- [ ] `x.controller.ts` con arrow functions y `export const xController = new XController()`
- [ ] `x.routes.ts` con el router
- [ ] Router registrado en `src/routes.ts`
- [ ] Tests del DTO y del service
- [ ] `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde

## Errores

Para devolver un error, lanzá un `HttpError` desde el DTO o el service:

| Situación                              | Uso                                   | Código |
| -------------------------------------- | ------------------------------------- | ------ |
| Datos inválidos (desde un DTO)         | `throw HttpError.validation(errores)` | 400    |
| Pedido incorrecto                      | `throw HttpError.badRequest('...')`   | 400    |
| No está logueado                       | `throw HttpError.unauthorized()`      | 401    |
| No tiene permiso (rol o recurso ajeno) | `throw HttpError.forbidden()`         | 403    |
| No existe                              | `throw HttpError.notFound('...')`     | 404    |
| Duplicado o estado inválido            | `throw HttpError.conflict('...')`     | 409    |

Todas las respuestas de error tienen el mismo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": ["dayOfWeek: debe ser un número del 0 al 6", "startTime: formato HH:mm"]
  }
}
```

## Convenciones

- Archivos en minúscula con el nombre del módulo: `schedules.service.ts`.
- Clases en PascalCase (`ScheduleService`), instancias en camelCase (`scheduleService`).
- Los imports entre archivos del backend terminan en `.js` (aunque el archivo sea `.ts`): lo exige Node con ES modules.
- Mensajes de error en español y dirigidos al usuario final.
