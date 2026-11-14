"use client";

import { useInstructor } from './InstructorProvider';
import Link from 'next/link';
import { InstructorPage, MetricCard, RouteLink, SectionCard } from './InstructorUI';

const instructorRoutes = [
  { title: 'Administrar cursos', description: 'Crea cursos y gestiona su estado de publicación.', href: '/instructor/dashboard/courses', action: 'Ir a Cursos' },
  { title: 'Organizar contenido', description: 'Estructura módulos y lecciones con orden y duración.', href: '/instructor/dashboard/content', action: 'Ir a Contenido' },
  { title: 'Preparar evaluaciones', description: 'Configura preguntas, intentos y requisitos de acceso.', href: '/instructor/dashboard/assessments', action: 'Ir a Evaluaciones' },
  { title: 'Revisar ESP / NFC', description: 'Consulta las evaluaciones presenciales y eventos de ejemplo.', href: '/instructor/dashboard/iot', action: 'Ir a ESP / NFC' },
];

export default function InstructorDashboardPage() {
  const { courses, enrollmentMetrics, resultMetrics } = useInstructor();
  const averageProgress = enrollmentMetrics.length
    ? Math.round(enrollmentMetrics.reduce((sum, item) => sum + item.progress, 0) / enrollmentMetrics.length)
    : 0;
  const averageScore = resultMetrics.length
    ? Math.round(resultMetrics.reduce((sum, item) => sum + item.score, 0) / resultMetrics.length)
    : 0;
  const passRate = resultMetrics.length
    ? Math.round((resultMetrics.filter((item) => item.passed).length / resultMetrics.length) * 100)
    : 0;
  const publishedCourses = courses.filter((course) => course.status === 'PUBLICADO').length;
  const nfcAssessments = courses.reduce(
    (total, course) => total + course.evaluations.filter((assessment) => assessment.requiresPresenceIoT).length,
    0,
  );
  const totalAssessments = courses.reduce((total, course) => total + course.evaluations.length, 0);

  return (
    <InstructorPage
      eyebrow="Panel del profesor"
      title="Un espacio para planificar, enseñar y evaluar."
      description="Revisa el estado general de tus cursos y entra directamente a la tarea que quieras realizar."
      actions={<RouteLink href="/instructor/dashboard/courses">Administrar cursos</RouteLink>}
    >
      <section aria-label="Resumen académico" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Estudiantes inscritos" value={enrollmentMetrics.length} detail="Inscripciones de ejemplo" />
        <MetricCard label="Progreso promedio" value={`${averageProgress}%`} detail="Promedio de progreso de muestra" />
        <MetricCard label="Promedio de evaluaciones" value={`${averageScore}/100`} detail={`${passRate}% de aprobación en la muestra`} />
        <MetricCard label="Cursos publicados" value={`${publishedCourses} / ${courses.length}`} detail={`${totalAssessments} evaluaciones · ${nfcAssessments} requieren NFC`} />
      </section>

      <SectionCard title="Accesos rápidos" description="Cada área tiene su propia página para mantener el trabajo organizado." className="mt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {instructorRoutes.map((route) => (
            <article key={route.href} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <h2 className="font-bold text-foreground">{route.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{route.description}</p>
              <Link href={route.href} className="mt-4 inline-flex text-sm font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300">
                {route.action} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Estado de tus cursos" description="La actividad de estudiantes y los resultados son datos de demostración." className="mt-5">
        {courses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Curso</th>
                  <th className="pb-3 pr-4 font-semibold">Estado</th>
                  <th className="pb-3 pr-4 font-semibold">Inscripciones</th>
                  <th className="pb-3 pr-4 font-semibold">Progreso medio</th>
                  <th className="pb-3 font-semibold">Estructura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {courses.map((course) => {
                  const enrollments = enrollmentMetrics.filter((item) => item.courseId === course.id);
                  const progress = enrollments.length
                    ? Math.round(enrollments.reduce((sum, item) => sum + item.progress, 0) / enrollments.length)
                    : 0;
                  return (
                    <tr key={course.id}>
                      <td className="py-3 pr-4 font-semibold text-foreground">{course.title}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{course.status === 'PUBLICADO' ? 'Publicado' : course.status === 'ARCHIVADO' ? 'Archivado' : 'Borrador'}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{enrollments.length}</td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{progress}%</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{course.modules.length} módulos · {course.evaluations.length} evaluaciones</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-500">Aún no tienes cursos registrados.</p>}
      </SectionCard>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
        <strong>Integración presencial:</strong> las evaluaciones pueden marcarse como presenciales y asociarse al flujo ESP32/NFC. La autorización real requiere una API segura y dispositivos registrados; esta interfaz solo muestra el flujo propuesto.
        <div className="mt-3"><RouteLink href="/instructor/dashboard/iot">Ver área ESP / NFC</RouteLink></div>
      </div>
    </InstructorPage>
  );
}
