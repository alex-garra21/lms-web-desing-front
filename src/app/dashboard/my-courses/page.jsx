import Image from 'next/image';
import Button from '@/components/Button';
import StudentShell from '../StudentShell';
import { enrolledCourses } from '../studentData';
import { maskRoute } from '@/utils/routeHasher';

export default function MyCoursesPage() {
  return (
    <StudentShell currentPath="/dashboard/my-courses">
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Espacio académico</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Mis cursos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Consulta tu inscripción, módulos, lecciones completadas y el contenido recomendado para continuar cada curso.
              </p>
            </div>
            <Button href={maskRoute('/dashboard/explore')} variant="brand" size="md">Explorar cursos</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
              {enrolledCourses.length} cursos activos
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              Sin cursos finalizados
            </span>
          </div>
        </section>

        <div className="mt-7 space-y-6">
          {enrolledCourses.map((course) => (
            <article
              id={`course-${course.id}`}
              key={course.id}
              className="scroll-mt-28 overflow-hidden rounded-[28px] border border-slate-200 bg-surface shadow-sm dark:border-slate-800"
            >
              <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="relative min-h-52 bg-slate-900">
                  <Image
                    src={course.thumbnail}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 280px"
                    unoptimized
                    className="object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {course.status}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-white">{course.category} · {course.format}</p>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black leading-tight text-foreground">{course.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description}</p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        Instructor: {course.instructor.name} · Duración estimada: {course.duration}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-2xl bg-blue-50 px-4 py-3 text-center dark:bg-blue-500/10">
                      <span className="block text-2xl font-black text-blue-700 dark:text-blue-300">{course.progress}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">completado</span>
                    </span>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${course.progress}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{course.completedLessons} de {course.totalLessons} lecciones completadas</span>
                    <span>{course.completedModules} de {course.totalModules} módulos terminados · Última actividad: {course.lastActivity}</span>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Contenido del curso</h3>
                      <ol className="mt-3 space-y-2">
                        {course.modules.map((module, index) => (
                          <li key={module.title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${module.status === 'Completado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                              {module.status === 'Completado' ? '✓' : index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-foreground">{module.title}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{module.lessons}</span>
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{module.status}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Siguiente paso</p>
                      <h3 className="mt-2 text-base font-extrabold text-foreground">{course.nextLesson}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">Módulo actual: {course.currentModule}</p>
                      {course.latestScore !== null && (
                        <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Última evaluación registrada: {course.latestScore}/100
                        </p>
                      )}
                      <Button href={maskRoute(`/dashboard/progress#course-${course.id}`)} variant="brand" size="sm" className="mt-4 rounded-xl">
                        Consultar avance
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Información de ejemplo para la interfaz. La inscripción, el desbloqueo de módulos y el progreso real requieren conexión con el backend.
        </p>
      </main>
    </StudentShell>
  );
}
