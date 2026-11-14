import StudentShell from '../StudentShell';
import { learningResources } from '../studentData';

export default function StudentResourcesPage() {
  return (
    <StudentShell currentPath="/dashboard/resources">
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Biblioteca del estudiante</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Recursos de aprendizaje</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Accede a documentación recomendada y avisos útiles para tus cursos. Los enlaces externos llevan a fuentes oficiales.
          </p>
        </section>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {learningResources.map((resource) => (
            <article key={resource.title} className="rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand dark:bg-blue-500/10" aria-hidden="true">
                  {resource.type === 'Aviso' ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17ZM5 18.5A2.5 2.5 0 0 1 7.5 16H20" />
                    </svg>
                  )}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {resource.type}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-foreground">{resource.title}</h2>
              <p className="mt-1 text-xs font-semibold text-brand">{resource.course}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{resource.description}</p>
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
                >
                  {resource.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  Verifica la programación oficial con tu instructor. El control de acceso NFC todavía no está integrado.
                </p>
              )}
            </article>
          ))}
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Esta biblioteca contiene referencias externas de ejemplo. Los materiales propios del curso se habilitarán cuando se conecte el módulo de contenidos.
        </p>
      </main>
    </StudentShell>
  );
}
