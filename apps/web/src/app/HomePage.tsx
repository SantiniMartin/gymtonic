import { useQuery } from '@tanstack/react-query';
import { Role } from '@gymtonic/shared';
import { api } from '@/lib/api';

type Health = { status: string; uptime: number; timestamp: string };

const roles: { role: Role; title: string; items: string[] }[] = [
  {
    role: Role.MEMBER,
    title: 'Alumno',
    items: [
      'Rutinas y checks',
      'Pago de mensualidad',
      'Progreso',
      'Horarios y entrenador',
      'QR de acceso',
    ],
  },
  {
    role: Role.TRAINER,
    title: 'Entrenador',
    items: ['Asignar rutinas', 'Lista y detalle de alumnos', 'Ingreso / egreso', 'Salario'],
  },
  {
    role: Role.ADMIN,
    title: 'Administrador',
    items: [
      'Dashboard de ingresos',
      'Estado de pagos',
      'Nómina',
      'ABM de usuarios',
      'Reportes Excel',
    ],
  },
];

export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<Health>('/health'),
    retry: false,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-brand-600 dark:text-brand-100">Gym Tonic</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gestión de gimnasio — fase 1: base del proyecto
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 font-semibold">Estado de la API</h2>
        {health.isPending && <p className="text-slate-500">Consultando…</p>}
        {health.isError && (
          <p className="text-red-600">No se pudo conectar con la API ({health.error.message}).</p>
        )}
        {health.isSuccess && (
          <p className="text-emerald-600">
            ✔ API en línea — {new Date(health.data.timestamp).toLocaleString('es-AR')}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {roles.map((r) => (
          <article
            key={r.role}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="mb-2 font-semibold text-brand-600 dark:text-brand-100">{r.title}</h3>
            <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-400">
              {r.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
