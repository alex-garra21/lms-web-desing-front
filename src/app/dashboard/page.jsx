import Button from '@/components/Button';
import StudentShell from './StudentShell';
import { enrolledCourses, progressActivity } from './studentData';
import { maskRoute } from '@/app/utils/routeHasher';

const completedLessons = enrolledCourses.reduce((total, course) => total + course.completedLessons, 0);
const totalLessons = enrolledCourses.reduce((total, course) => total + course.totalLessons, 0);
const averageProgress = Math.round(
  enrolledCourses.reduce((total, course) => total + course.progress, 0) / enrolledCourses.length,
);

export default function StudentDashboardPage() {
  return (
    <StudentShell currentPath="/dashboard">
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
                Retoma tus lecciones, consulta tu avance y encuentra los materiales que necesitas para continuar.
              </p>
            </div>
            <Button href={maskRoute('/dashboard/explore')} size="md" variant="brand">
              Explorar cursos
            </Button>
          </div>
        </section>

        <section aria-label="Resumen académico" className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Cursos inscritos', value: enrolledCourses.length, detail: 'Actualmente en curso' },
            { label: 'Lecciones completadas', value: `${completedLessons} / ${totalLessons}`, detail: 'En tus cursos activos' },
            { label: 'Avance promedio', value: `${averageProgress}%`, detail: 'Promedio de progreso' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-black text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
            </article>
          ))}
        </section>

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Tu aprendizaje</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Continúa tus cursos</h2>
              </div>
              <Button href={maskRoute('/dashboard/my-courses')} variant="ghost" size="sm">
                Ver mis cursos
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {enrolledCourses.map((course) => (
                <article key={course.id} className="rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {course.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{course.progress}%</span>
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold leading-snug text-foreground">{course.title}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Siguiente: {course.nextLesson}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${course.progress}%` }} />
                  </div>
                  <Button
                    href={maskRoute(`/dashboard/my-courses#course-${course.id}`)}
                    variant="secondary"
                    size="sm"
                    className="mt-4 rounded-xl"
                  >
                    Ver curso
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Actividad reciente</p>
                  <h2 className="mt-1 text-xl font-black text-foreground">Tu semana</h2>
                </div>
                <Button href={maskRoute('/dashboard/progress')} variant="ghost" size="sm">
                  Ver avance
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {progressActivity.slice(0, 2).map((activity) => (
                  <article key={`${activity.date}-${activity.course}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{activity.date} · {activity.activity}</p>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{activity.result}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{activity.course}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 dark:border-blue-500/20 dark:from-blue-950/40 dark:to-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Material de estudio</p>
              <h2 className="mt-2 text-lg font-black text-foreground">Tus recursos en un solo lugar</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Consulta guías, documentación recomendada y avisos sobre actividades presenciales.
              </p>
              <Button href={maskRoute('/dashboard/resources')} variant="secondary" size="sm" className="mt-4 rounded-xl">
                Abrir recursos
              </Button>
            </section>
          </aside>
        </div>

        <p className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Panel de demostración: los cursos, métricas y actividades son datos de ejemplo y todavía no provienen de Supabase.
        </p>
      </main>
    </StudentShell>
  );
}
