import StudentShell from '../StudentShell';
import { enrolledCourses, progressActivity } from '../studentData';
import { encodeId } from '@/utils/routeHasher';

const averageProgress = Math.round(
  enrolledCourses.reduce((total, course) => total + course.progress, 0) / enrolledCourses.length,
);
const completedLessons = enrolledCourses.reduce((total, course) => total + course.completedLessons, 0);
const totalLessons = enrolledCourses.reduce((total, course) => total + course.totalLessons, 0);
const gradedAssessments = enrolledCourses.filter((course) => course.latestScore !== null).length;

export default function StudentProgressPage() {
  return (
    <StudentShell currentPath="/dashboard/progress">
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Seguimiento académico</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Mi avance</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Revisa las lecciones completadas, los módulos actuales y tus resultados de evaluación en cada curso.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Resumen de avance">
          {[
            { label: 'Avance promedio', value: `${averageProgress}%`, note: 'Promedio de cursos activos' },
            { label: 'Lecciones completadas', value: `${completedLessons}/${totalLessons}`, note: 'Lecciones registradas' },
            { label: 'Evaluaciones calificadas', value: gradedAssessments, note: 'Resultados de ejemplo' },
          ].map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className="mt-2 text-3xl font-black text-foreground">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-foreground">Avance por curso</h2>
          <div className="mt-4 space-y-4">
            {enrolledCourses.map((course) => (
              <article id={`course-${encodeId(course.id)}`} key={course.id} className="scroll-mt-28 rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="text-xs font-semibold text-brand">{course.category}</span>
                    <h3 className="mt-1 text-lg font-extrabold text-foreground">{course.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Módulo actual: {course.currentModule}</p>
                  </div>
                  <p className="text-2xl font-black text-brand">{course.progress}%</p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${course.progress}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{course.completedLessons} / {course.totalLessons} lecciones · {course.completedModules} / {course.totalModules} módulos</span>
                  <span>Última actividad: {course.lastActivity}</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Siguiente lección</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{course.nextLesson}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Última evaluación</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {course.latestScore === null ? 'Aún no hay calificación registrada' : `${course.latestScore} / 100`}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-foreground">Registro de actividad</h2>
          <ol className="mt-4 space-y-3">
            {progressActivity.map((activity) => (
              <li key={`${activity.date}-${activity.activity}-${activity.course}`} className="flex gap-4 rounded-2xl border border-slate-200 bg-surface p-4 dark:border-slate-800">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{activity.activity}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{activity.date}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{activity.course} · {activity.result}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Los avances y resultados mostrados son datos de demostración; en producción se calcularán a partir de las lecciones y resultados guardados en la base de datos.
        </p>
      </main>
    </StudentShell>
  );
}
