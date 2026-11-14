"use client";

import { iotEvents } from '../instructorData';
import { useInstructor } from '../InstructorProvider';
import { CourseSelect, InstructorPage, MetricCard, SectionCard } from '../InstructorUI';

export default function InstructorIotPage() {
  const { selectedCourse } = useInstructor();
  const assessments = selectedCourse.evaluations.filter((assessment) => assessment.requiresPresenceIoT);
  const courseEvents = iotEvents.filter((event) => event.course === selectedCourse.title);

  return (
    <InstructorPage
      eyebrow="Control de acceso presencial"
      title="ESP32 / NFC"
      description="Consulta qué evaluaciones requieren presencia física y revisa eventos de ejemplo asociados a lectores del aula."
    >
      <div className="mt-8 max-w-xl">
        <CourseSelect />
      </div>
      <section aria-label="Resumen de acceso físico" className="mt-5 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Evaluaciones con NFC" value={assessments.length} detail="Configuradas en los cursos" />
        <MetricCard label="Eventos de demostración" value={courseEvents.length} detail="Registros ficticios de este curso" />
        <MetricCard label="Lectores conectados" value="No disponible" detail="La integración con ESP32 está pendiente" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Flujo de acceso" description="El lector identifica la tarjeta NFC del estudiante. El backend debe validar el dispositivo y la inscripción antes de autorizar un examen presencial.">
          <ol className="space-y-3">
            {[
              ['1', 'El docente configura la evaluación para requerir presencia física.'],
              ['2', 'El estudiante presenta su tarjeta en el lector del aula.'],
              ['3', 'El sistema valida la identidad y habilita el acceso por tiempo limitado.'],
              ['4', 'El evento queda registrado para auditoría del curso.'],
            ].map(([step, text]) => (
              <li key={step} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800 dark:bg-blue-400/20 dark:text-blue-200">{step}</span>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Esta interfaz no lee tarjetas ni controla dispositivos. Las credenciales del ESP32, UID de tarjetas y reglas de autorización deben manejarse en el backend, nunca en el cliente público.
          </div>
        </SectionCard>

        <SectionCard title="Evaluaciones que requieren presencia">
          {assessments.length ? (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <article key={assessment.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-foreground">{assessment.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{assessment.courseTitle}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">Presencial / NFC</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    {assessment.questions.length} preguntas · {assessment.timeLimit} min · mínimo {assessment.minimumScore}% · {assessment.maxAttempts} intento(s)
                  </p>
                </article>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">Ninguna evaluación requiere presencia por ahora. Puedes cambiarlo en Evaluaciones.</p>}
        </SectionCard>

        <SectionCard title="Registro de eventos de ejemplo" description="Datos ficticios para mostrar cómo se vería una bitácora del aula." className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Estudiante</th>
                  <th className="pb-3 pr-4 font-semibold">Curso</th>
                  <th className="pb-3 pr-4 font-semibold">Evento</th>
                  <th className="pb-3 pr-4 font-semibold">Lector</th>
                  <th className="pb-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {courseEvents.map((event) => (
                  <tr key={`${event.student}-${event.when}`}>
                    <td className="py-3 pr-4 font-semibold text-foreground">{event.student}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{event.course}</td>
                    <td className="py-3 pr-4"><span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-400/10 dark:text-blue-200">{event.action}</span></td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{event.reader}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{event.when}</td>
                  </tr>
                ))}
                {!courseEvents.length && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-sm text-slate-500">No hay eventos de ejemplo para este curso.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </InstructorPage>
  );
}
