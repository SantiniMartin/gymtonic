/**
 * Seed de desarrollo. Borra los datos existentes y crea:
 *  - 1 administrador
 *  - 2 entrenadores con tarifa y disponibilidad
 *  - 5 alumnos con horarios, progreso y cuotas en distintos estados:
 *      · al día · vence pronto · adeuda 1 cuota · adeuda 2 cuotas (acceso denegado) · nuevo sin onboarding
 *  - Precio vigente de la mensualidad
 *  - Turnos (ingreso/egreso) de los entrenadores
 *
 * Las rutinas se agregan en la fase 4, cuando exista la caché de ExerciseDB.
 */
import {
  PrismaClient,
  Prisma,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Gymtonic123';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@gymtonic.local';
const MONTHLY_FEE = new Prisma.Decimal(30000);

/** Fecha (00:00 UTC) desplazada `days` días desde hoy. */
function daysFromToday(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function period(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function reset() {
  // Orden inverso a las dependencias.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.trainerShift.deleteMany(),
    prisma.accessLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.membershipPrice.deleteMany(),
    prisma.routineCheck.deleteMany(),
    prisma.routineExercise.deleteMany(),
    prisma.routineDay.deleteMany(),
    prisma.routine.deleteMany(),
    prisma.progressEntry.deleteMany(),
    prisma.schedule.deleteMany(),
    prisma.trainerSchedule.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.memberProfile.deleteMany(),
    prisma.trainerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

type InvoicePlan = { monthsAgo: number; paid: boolean };

async function createMember(opts: {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  trainerId: string | null;
  onboardingCompleted: boolean;
  /** Día de vencimiento: hoy + este offset (define el `dueDate` de la cuota actual). */
  dueOffsetDays: number;
  invoices: InvoicePlan[];
  passwordHash: string;
  adminId: string;
}) {
  const currentDue = daysFromToday(opts.dueOffsetDays);
  const start = addMonths(currentDue, -Math.max(...opts.invoices.map((i) => i.monthsAgo), 0) - 1);

  const user = await prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: opts.passwordHash,
      firstName: opts.firstName,
      lastName: opts.lastName,
      role: Role.MEMBER,
      memberProfile: {
        create: {
          birthDate: opts.birthDate,
          trainerId: opts.trainerId,
          onboardingCompleted: opts.onboardingCompleted,
          membershipStartDate: start,
        },
      },
    },
  });

  if (opts.onboardingCompleted) {
    await prisma.schedule.createMany({
      data: [
        { memberId: user.id, dayOfWeek: 1, startTime: '08:00', endTime: '09:30' },
        { memberId: user.id, dayOfWeek: 3, startTime: '08:00', endTime: '09:30' },
        { memberId: user.id, dayOfWeek: 5, startTime: '18:00', endTime: '19:30' },
      ],
    });

    // Línea de progreso: un registro por mes en los últimos 4 meses.
    const age = new Date().getUTCFullYear() - opts.birthDate.getUTCFullYear();
    await prisma.progressEntry.createMany({
      data: [3, 2, 1, 0].map((m, idx) => ({
        memberId: user.id,
        date: addMonths(daysFromToday(0), -m),
        weightKg: new Prisma.Decimal(82 - idx * 1.2),
        heightCm: new Prisma.Decimal(175),
        age,
      })),
    });
  }

  for (const inv of opts.invoices) {
    const dueDate = addMonths(currentDue, -inv.monthsAgo);
    const overdue = !inv.paid && dueDate < daysFromToday(0);
    await prisma.invoice.create({
      data: {
        memberId: user.id,
        period: period(dueDate),
        amount: MONTHLY_FEE,
        dueDate,
        status: inv.paid
          ? InvoiceStatus.PAID
          : overdue
            ? InvoiceStatus.OVERDUE
            : InvoiceStatus.PENDING,
        paidAt: inv.paid ? addMonths(dueDate, 0) : null,
        payments: inv.paid
          ? {
              create: {
                method: PaymentMethod.CASH,
                status: PaymentStatus.APPROVED,
                amount: MONTHLY_FEE,
                registeredById: opts.adminId,
              },
            }
          : undefined,
      },
    });
  }

  return user;
}

async function main() {
  console.log('🌱 Reiniciando datos...');
  await reset();

  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  // ── Admin ──
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Gym Tonic',
      role: Role.ADMIN,
    },
  });

  // ── Precio vigente ──
  await prisma.membershipPrice.createMany({
    data: [
      {
        amount: new Prisma.Decimal(25000),
        validFrom: addMonths(daysFromToday(0), -12),
        createdById: admin.id,
      },
      { amount: MONTHLY_FEE, validFrom: addMonths(daysFromToday(0), -6), createdById: admin.id },
    ],
  });

  // ── Entrenadores ──
  const trainersData = [
    {
      email: 'laura.gomez@gymtonic.local',
      firstName: 'Laura',
      lastName: 'Gómez',
      specialty: 'Hipertrofia y fuerza',
      hourlyRate: 8000,
      perStudentRate: 3000,
      availability: [1, 3, 5].map((d) => ({ dayOfWeek: d, startTime: '07:00', endTime: '13:00' })),
    },
    {
      email: 'diego.ruiz@gymtonic.local',
      firstName: 'Diego',
      lastName: 'Ruiz',
      specialty: 'Funcional y pérdida de peso',
      hourlyRate: 7500,
      perStudentRate: 2500,
      availability: [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        startTime: '15:00',
        endTime: '22:00',
      })),
    },
  ];

  const trainers = [];
  for (const t of trainersData) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash,
        firstName: t.firstName,
        lastName: t.lastName,
        role: Role.TRAINER,
        trainerProfile: {
          create: {
            specialty: t.specialty,
            hourlyRate: new Prisma.Decimal(t.hourlyRate),
            perStudentRate: new Prisma.Decimal(t.perStudentRate),
            availability: { create: t.availability },
          },
        },
      },
    });
    trainers.push(user);

    // Turnos de los últimos 10 días hábiles (4 h cada uno).
    for (let i = 1; i <= 14; i++) {
      const day = daysFromToday(-i);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      const checkIn = new Date(day);
      checkIn.setUTCHours(t.availability[0]!.startTime === '07:00' ? 10 : 18, 0, 0, 0);
      const checkOut = new Date(checkIn.getTime() + 4 * 60 * 60 * 1000);
      await prisma.trainerShift.create({
        data: { trainerId: user.id, checkIn, checkOut, durationMinutes: 240 },
      });
    }
  }

  const [laura, diego] = trainers as [(typeof trainers)[number], (typeof trainers)[number]];

  // ── Alumnos ──
  const members = [
    {
      email: 'juan.perez@gymtonic.local',
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: new Date('1995-04-12'),
      trainerId: laura.id,
      onboardingCompleted: true,
      dueOffsetDays: 20, // al día
      invoices: [
        { monthsAgo: 2, paid: true },
        { monthsAgo: 1, paid: true },
        { monthsAgo: 0, paid: false },
      ],
    },
    {
      email: 'sofia.lopez@gymtonic.local',
      firstName: 'Sofía',
      lastName: 'López',
      birthDate: new Date('1999-09-30'),
      trainerId: laura.id,
      onboardingCompleted: true,
      dueOffsetDays: 3, // vence dentro de los próximos 5 días → aviso
      invoices: [
        { monthsAgo: 1, paid: true },
        { monthsAgo: 0, paid: false },
      ],
    },
    {
      email: 'martin.diaz@gymtonic.local',
      firstName: 'Martín',
      lastName: 'Díaz',
      birthDate: new Date('1988-01-20'),
      trainerId: diego.id,
      onboardingCompleted: true,
      dueOffsetDays: 15, // adeuda 1 cuota (la del mes pasado)
      invoices: [
        { monthsAgo: 2, paid: true },
        { monthsAgo: 1, paid: false },
        { monthsAgo: 0, paid: false },
      ],
    },
    {
      email: 'carla.fernandez@gymtonic.local',
      firstName: 'Carla',
      lastName: 'Fernández',
      birthDate: new Date('1992-06-05'),
      trainerId: diego.id,
      onboardingCompleted: true,
      dueOffsetDays: 10, // adeuda 2 cuotas → acceso denegado
      invoices: [
        { monthsAgo: 2, paid: false },
        { monthsAgo: 1, paid: false },
        { monthsAgo: 0, paid: false },
      ],
    },
    {
      email: 'nuevo.alumno@gymtonic.local',
      firstName: 'Nuevo',
      lastName: 'Alumno',
      birthDate: new Date('2001-11-15'),
      trainerId: null,
      onboardingCompleted: false, // debe elegir horario y entrenador
      dueOffsetDays: 30,
      invoices: [{ monthsAgo: 0, paid: false }],
    },
  ];

  for (const m of members) {
    await createMember({ ...m, passwordHash, adminId: admin.id });
  }

  const counts = {
    usuarios: await prisma.user.count(),
    cuotas: await prisma.invoice.count(),
    turnos: await prisma.trainerShift.count(),
  };

  console.log('✅ Seed completo:', counts);
  console.log(`   Contraseña de todos los usuarios: ${DEFAULT_PASSWORD}`);
  console.log(`   Admin: ${ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
