import Navbar from '@/app/components/Navbar';
import Button from '@/app/components/Button';
import CourseCard from '@/app/components/CourseCard';
import { maskRoute } from '@/app/utils/routeHasher';

const enrolledCourses = [
  {
    id: 101,
    title: 'Desarrollo Web y Arquitectura de Sistemas',
    description:
      'Construye aplicaciones web y comprende cómo se diseñan sus componentes y servicios.',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
    category: 'Ingeniería de Sistemas',
    level: 'Intermedio',
    duration: '24 horas',
    lessonsCount: 18,
    rating: 4.9,
    reviewsCount: 32,
    instructor: {
      name: 'Ing. Carlos Mendoza',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      title: 'Catedrático UMG',
    },
    progress: 68,
  },
  {
    id: 202,
    title: 'Bases de Datos y Modelado de Información',
    description:
      'Practica el diseño relacional, las consultas y la organización de datos para aplicaciones.',
    thumbnail:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=900&q=80',
    category: 'Bases de Datos',
    level: 'Principiante',
    duration: '15 horas',
    lessonsCount: 12,
    rating: 4.8,
    reviewsCount: 24,
    instructor: {
      name: 'Ing. Alejandro Ramos',
      avatar: null,
      title: 'Docente UMG',
    },
    progress: 35,
  },
];

const summary = [
  { label: 'Cursos inscritos', value: '2', detail: 'En tu espacio académico' },
  { label: 'Lecciones completadas', value: '18', detail: 'Sigue avanzando a tu ritmo' },
  { label: 'Avance promedio', value: '52%', detail: 'En tus cursos activos' },
];

const weeklyPlan = [
  {
    date: 'HOY',
    time: 'A tu ritmo',
    title: 'Continuar Desarrollo Web',
    description: 'Siguiente: arquitectura de aplicaciones',
    type: 'Lección',
  },
  {
    date: 'PRÓXIMO',
    time: 'Por confirmar',
    title: 'Evaluación presencial',
    description: 'Consulta fecha y aula con tu instructor.',
    type: 'Campus',
  },
];

export default function StudentDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar role="student" currentPath="/dashboard" />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Panel del estudiante
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                ¡Bienvenido a tu espacio de aprendizaje!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                Revisa tus cursos, retoma una lección y mantente al tanto de tus actividades académicas.
              </p>
            </div>
            <Button href={maskRoute('/courses')} size="md" variant="brand">
              Explorar cursos
            </Button>
          </div>
        </section>

        <section aria-label="Resumen académico" className="mt-6 grid gap-4 sm:grid-cols-3">
          {summary.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-black text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
            </article>
          ))}
        </section>

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section id="my-courses" className="scroll-mt-24">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Tu aprendizaje</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Continúa tus cursos</h2>
              </div>
              <Button href={maskRoute('/courses')} variant="ghost" size="sm">
                Ver catálogo
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {enrolledCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={course.progress}
                  isEnrolled
                  actionText="Continuar curso"
                  actionHref={maskRoute('/courses')}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section id="progress" className="scroll-mt-24 rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Actividad</p>
                  <h2 className="mt-1 text-xl font-black text-foreground">Tu semana</h2>
                </div>
                <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  2 pendientes
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {weeklyPlan.map((activity) => (
                  <article
                    key={activity.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {activity.date} · {activity.time}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {activity.type}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-foreground">{activity.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{activity.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="resources" className="scroll-mt-24 rounded-[26px] border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 dark:border-blue-500/20 dark:from-blue-950/40 dark:to-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-black text-foreground">Evaluaciones en campus</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Las evaluaciones del proyecto son presenciales. La validación de acceso mediante NFC forma parte de la arquitectura propuesta y aún no está conectada en esta vista.
              </p>
              <Button href={maskRoute('/faculty')} variant="secondary" size="sm" className="mt-4 rounded-xl">
                Consultar docentes
              </Button>
            </section>
          </aside>
        </div>

        <p className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Panel de demostración: los cursos, métricas y actividades mostrados son datos de ejemplo y todavía no provienen de una cuenta autenticada ni de Supabase.
        </p>
      </main>
    </div>
  );
}
