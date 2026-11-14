import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import { maskRoute } from '@/utils/routeHasher';

const learningSteps = [
  {
    number: '01',
    title: 'Explora cursos',
    description:
      'Encuentra cursos organizados por instructor, módulos y lecciones, con información clara sobre cada recorrido.',
  },
  {
    number: '02',
    title: 'Aprende a tu ritmo',
    description:
      'Avanza por el contenido y consulta tu progreso para saber qué lecciones y actividades tienes pendientes.',
  },
  {
    number: '03',
    title: 'Demuestra lo aprendido',
    description:
      'Completa evaluaciones de opción múltiple y consulta tus resultados al finalizar cada evaluación.',
  },
];

const projectFeatures = [
  {
    title: 'Contenido organizado',
    description: 'Los cursos se estructuran en módulos y lecciones para facilitar un avance claro y ordenado.',
    icon: '01',
  },
  {
    title: 'Seguimiento del progreso',
    description: 'Las inscripciones y el avance por lección permiten dar seguimiento al recorrido del estudiante.',
    icon: '02',
  },
  {
    title: 'Evaluaciones presenciales',
    description:
      'El sistema contempla evaluaciones en el campus. La propuesta de arquitectura incorpora NFC para validar el acceso físico al examen.',
    icon: '03',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar currentPath="/about" />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 px-6 py-12 text-white shadow-xl shadow-blue-950/10 sm:px-10 lg:px-14 lg:py-16">
          <div className="absolute -right-20 -top-20 -z-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 -z-10 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                Universidad Mariano Gálvez de Guatemala
              </span>
              <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Aprender, crecer y construir nuevas oportunidades.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
                Este proyecto presenta una plataforma de cursos en línea pensada para acompañar la experiencia académica: desde el contenido y el progreso, hasta las evaluaciones y el seguimiento docente.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={maskRoute('/courses')} size="lg" variant="brand">
                  Explorar cursos
                </Button>
                <Button
                  href={maskRoute('/faculty')}
                  size="lg"
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Conocer docentes
                </Button>
              </div>
              <p className="mt-6 text-xs leading-5 text-slate-300">
                Prototipo académico desarrollado para el curso de Desarrollo Web y Arquitectura de Sistemas.
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[26px] border border-white/15 bg-white/5 p-2 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85"
                  alt="Estudiantes recorriendo un campus universitario"
                  className="h-[300px] w-full rounded-[20px] object-cover sm:h-[390px]"
                />
              </div>
              <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-slate-950/85 p-4 shadow-xl backdrop-blur-md sm:left-10 sm:right-10">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                  Una experiencia conectada
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-white">
                  Recursos digitales para aprender, con evaluación presencial contemplada en la arquitectura del sistema.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Acerca de este proyecto</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Una plataforma educativa diseñada alrededor del proceso de aprendizaje.
            </h2>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 sm:p-8">
            <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
              El LMS permite que los docentes publiquen cursos organizados en módulos y lecciones. Los estudiantes pueden inscribirse, avanzar por el contenido, presentar evaluaciones de opción múltiple con calificación automática y consultar su progreso y resultados.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              El proyecto también contempla herramientas para que el instructor revise el avance y las calificaciones del curso, además de emitir una constancia simple cuando el estudiante complete los requisitos.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Cursos y módulos', 'Progreso por lección', 'Evaluaciones', 'Resultados', 'Constancias'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Cómo funciona</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Un recorrido académico de principio a fin.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {learningSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-sm font-black text-brand">
                  {step.number}
                </span>
                <h3 className="mt-5 text-xl font-extrabold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-950 p-7 text-white sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Arquitectura del sistema</p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                La experiencia digital se conecta con el campus.
              </h2>
              <p className="mt-4 text-sm leading-6 text-blue-100">
                Los exámenes del proyecto son presenciales. Por eso, la arquitectura contempla un mecanismo NFC para validar el acceso físico a las evaluaciones.
              </p>
              <span className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                Componente propuesto para el proyecto
              </span>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
              {projectFeatures.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-xs font-black tracking-[0.15em] text-brand">{feature.icon}</span>
                  <h3 className="mt-3 text-base font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[30px] border border-slate-200 bg-gradient-to-r from-blue-50 to-sky-50 p-7 text-center dark:border-slate-800 dark:from-slate-900 dark:to-blue-950/40 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Da el siguiente paso</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Explora los cursos y descubre tu próxima oportunidad de aprendizaje.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Conoce el catálogo académico o visita la sección de docentes para explorar el enfoque de enseñanza.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button href={maskRoute('/courses')} size="lg" variant="brand">
              Ver catálogo
            </Button>
            <Button href={maskRoute('/faculty')} size="lg" variant="secondary">
              Ver docentes
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
