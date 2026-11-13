"use client";

import React, { useState } from 'react';
import Button from '@/app/components/Button';
import Input from '@/app/components/Input';
import CourseCard from '@/app/components/CourseCard';
import { maskRoute, createMaskedUrl } from '@/app/utils/routeHasher';

/**
 * Dashboard del Estudiante (LMS UMG).
 *
 * Pensado primero para el estudiante NUEVO (sin cursos) y preparado para
 * cuando ya tenga inscripciones ("Continúa donde lo dejaste").
 * Cumple AGENTS.md: Tailwind con tokens de globals.css, modo oscuro nativo,
 * estados de carga/errores y rutas enmascaradas con maskRoute()/createMaskedUrl().
 *
 * @param {Object} props
 * @param {{name?: string, email?: string}} [props.user] - Usuario autenticado
 * @param {Array<Object>} [props.enrolledCourses] - Cursos inscritos (cada uno con `progress` 0-100)
 * @param {Array<Object>} [props.recommendedCourses] - Cursos sugeridos (misma forma que CourseCard)
 * @param {Array<{id: string|number, title: string, date?: string, text?: string}>} [props.announcements]
 * @param {{lessonsCompleted?: number, studyHours?: number, certificates?: number}} [props.stats]
 * @param {{profileCompleted?: boolean, visitedCatalog?: boolean, firstLessonDone?: boolean}} [props.onboarding]
 * @param {boolean} [props.isLoading] - Muestra esqueleto de carga
 * @param {(code: string) => Promise<{ok: boolean, message?: string}>} [props.onRedeemCode]
 * @param {string} [props.className]
 */
export function StudentDashboard({
  user = null,
  enrolledCourses = [],
  recommendedCourses = [],
  announcements = [],
  stats = {},
  onboarding = {},
  isLoading = false,
  onRedeemCode,
  className = '',
}) {
  if (isLoading) return <DashboardSkeleton />;

  const firstName = (user?.name || 'Estudiante').split(' ')[0];
  const hasCourses = enrolledCourses.length > 0;

  const enrolledIds = new Set(enrolledCourses.map((c) => String(c.id)));
  const suggestions = recommendedCourses.filter((c) => !enrolledIds.has(String(c.id)));

  // Curso a retomar: el de mayor avance que aún no esté terminado
  const inProgress = enrolledCourses.filter((c) => (c.progress ?? 0) < 100);
  const resumeCourse = hasCourses
    ? [...(inProgress.length ? inProgress : enrolledCourses)].sort(
        (a, b) => (b.progress ?? 0) - (a.progress ?? 0)
      )[0]
    : null;

  const summary = [
    { icon: '📚', label: 'Cursos activos', value: enrolledCourses.length },
    { icon: '✅', label: 'Lecciones completadas', value: stats.lessonsCompleted ?? 0 },
    { icon: '⏱️', label: 'Horas de estudio', value: stats.studyHours ?? 0 },
    { icon: '🎓', label: 'Certificados', value: stats.certificates ?? 0 },
  ];

  const checklist = [
    {
      id: 'account',
      title: 'Crear tu cuenta',
      description: '¡Ya diste el primer paso!',
      done: true,
    },
    {
      id: 'profile',
      title: 'Completar tu perfil',
      description: 'Agrega tu foto y datos académicos.',
      done: Boolean(onboarding.profileCompleted),
      href: maskRoute('/profile'),
      cta: 'Ir al perfil',
    },
    {
      id: 'catalog',
      title: 'Explorar el catálogo',
      description: 'Conoce los cursos disponibles en UMG.',
      done: Boolean(onboarding.visitedCatalog) || hasCourses,
      href: maskRoute('/courses'),
      cta: 'Ver catálogo',
    },
    {
      id: 'enroll',
      title: 'Inscribirte a tu primer curso',
      description: 'Elige uno o canjea tu código de asignación.',
      done: hasCourses,
      href: maskRoute('/courses'),
      cta: 'Elegir curso',
    },
    {
      id: 'lesson',
      title: 'Ver tu primera lección',
      description: hasCourses
        ? 'Tu curso te espera.'
        : 'Se habilita cuando te inscribas a un curso.',
      done: Boolean(onboarding.firstLessonDone),
      href: resumeCourse
        ? createMaskedUrl('/courses', resumeCourse.id, { view: 'player' })
        : undefined,
      cta: 'Empezar',
    },
  ];

  const doneCount = checklist.filter((s) => s.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const allDone = doneCount === checklist.length;

  return (
    <div className={`space-y-8 ${className}`.trim()}>
      {/* 1. BIENVENIDA */}
      <section
        aria-labelledby="welcome-title"
        className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-brand/10 via-surface to-surface p-6 sm:p-8 shadow-sm"
      >
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
            {hasCourses ? 'Tu panel' : 'Nuevo en LMS UMG'}
          </span>
          <h1 id="welcome-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {hasCourses ? `¡Qué bueno verte de nuevo, ${firstName}!` : `¡Bienvenido a LMS UMG, ${firstName}! 👋`}
          </h1>
          <p className="text-sm sm:text-base text-muted">
            {hasCourses
              ? 'Retoma tus cursos y sigue avanzando a tu ritmo.'
              : 'Aquí empieza tu camino de aprendizaje. Sigue los pasos de abajo y en pocos minutos estarás en tu primera clase.'}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href={maskRoute('/courses')}>Explorar cursos</Button>
            {resumeCourse && (
              <Button variant="outline" href={createMaskedUrl('/courses', resumeCourse.id, { view: 'player' })}>
                Continuar clase
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 6. TARJETAS DE RESUMEN (en cero para el estudiante nuevo) */}
      <section aria-label="Resumen de actividad" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-4 sm:p-5 shadow-sm"
          >
            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{item.value}</p>
            <p className="text-xs font-medium text-muted">{item.label}</p>
          </div>
        ))}
      </section>
      {!hasCourses && (
        <p className="-mt-4 text-xs text-muted">
          Tus números aparecerán aquí cuando empieces tu primer curso. ¡Todo gran avance empieza en cero!
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* COLUMNA PRINCIPAL */}
        <div className="space-y-8 lg:col-span-2">
          {/* 2. CHECKLIST "COMIENZA AQUÍ" */}
          {!allDone && (
            <section
              aria-labelledby="checklist-title"
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-surface p-5 sm:p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 id="checklist-title" className="text-lg font-bold text-foreground">Comienza aquí</h2>
                <span className="text-xs font-semibold text-brand">{doneCount} de {checklist.length} pasos</span>
              </div>
              <div
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de la guía de inicio"
              >
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>

              <ul className="mt-5 space-y-3">
                {checklist.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        step.done
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 dark:border-slate-600 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${step.done ? 'text-muted line-through' : 'text-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted">{step.description}</p>
                    </div>
                    {!step.done && step.href && (
                      <Button size="sm" variant="secondary" href={step.href}>{step.cta}</Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 10. CONTINÚA DONDE LO DEJASTE (solo con cursos) */}
          {resumeCourse && (
            <section
              aria-labelledby="resume-title"
              className="rounded-3xl border border-brand/30 bg-brand/5 p-5 sm:p-6 shadow-sm"
            >
              <h2 id="resume-title" className="text-lg font-bold text-foreground">Continúa donde lo dejaste</h2>
              <p className="mt-1 text-sm font-semibold text-foreground">{resumeCourse.title}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${resumeCourse.progress ?? 0}%` }} />
                </div>
                <span className="text-xs font-bold text-brand">{resumeCourse.progress ?? 0}%</span>
              </div>
              <div className="mt-4">
                <Button href={createMaskedUrl('/courses', resumeCourse.id, { view: 'player' })}>Continuar clase</Button>
              </div>
            </section>
          )}

          {/* 3. MIS CURSOS: ESTADO VACÍO o LISTADO */}
          <section aria-labelledby="my-courses-title" className="space-y-4">
            <h2 id="my-courses-title" className="text-lg font-bold text-foreground">Mis cursos</h2>
            {hasCourses ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {enrolledCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled
                    progress={course.progress ?? 0}
                    actionText="Continuar clase"
                  />
                ))}
              </div>
            ) : (
              <EmptyCourses />
            )}
          </section>

          {/* 5. CURSOS RECOMENDADOS */}
          {suggestions.length > 0 && (
            <section aria-labelledby="recommended-title" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 id="recommended-title" className="text-lg font-bold text-foreground">
                  {hasCourses ? 'Te puede interesar' : 'Para empezar'}
                </h2>
                <Button size="sm" variant="ghost" href={maskRoute('/courses')}>Ver todos</Button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {suggestions.slice(0, 4).map((course) => (
                  <CourseCard key={course.id} course={course} actionText="Ver detalles" />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* COLUMNA LATERAL */}
        <aside className="space-y-6">
          {/* 4. CÓDIGO DE ASIGNACIÓN */}
          <RedeemCodeCard onRedeemCode={onRedeemCode} />

          {/* 7. ACCESOS RÁPIDOS */}
          <QuickLinks />

          {/* 8. AVISOS Y AYUDA */}
          <AnnouncementsCard announcements={announcements} />
          <HelpCard />
        </aside>
      </div>
    </div>
  );
}

/* ----------------------------- SUBCOMPONENTES ----------------------------- */

function EmptyCourses() {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-surface px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-3xl" aria-hidden="true">
        🎒
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">Aún no estás inscrito en ningún curso</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Explora el catálogo y elige tu primer curso, o canjea el código que te dio Secretaría.
      </p>
      <div className="mt-5">
        <Button href={maskRoute('/courses')}>Explorar catálogo</Button>
      </div>
    </div>
  );
}

function RedeemCodeCard({ onRedeemCode }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success' | 'info', text }

  async function handleSubmit(event) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();

    if (!/^[A-Z0-9-]{6,20}$/.test(clean)) {
      setFeedback({ type: 'error', text: 'Ingresa un código válido (6 a 20 letras, números o guiones).' });
      return;
    }

    // El canje real se conectará a Supabase más adelante.
    if (!onRedeemCode) {
      setFeedback({ type: 'info', text: 'El canje de códigos aún no está conectado al servidor.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await onRedeemCode(clean);
      if (result?.ok) {
        setFeedback({ type: 'success', text: result.message || '¡Código canjeado! Ya tienes un nuevo curso.' });
        setCode('');
      } else {
        setFeedback({ type: 'error', text: result?.message || 'El código no es válido o ya fue usado.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo canjear el código. Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  }

  const feedbackStyles = {
    error: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    info: 'text-muted',
  };

  return (
    <section
      aria-labelledby="redeem-title"
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-surface p-5 shadow-sm"
    >
      <h2 id="redeem-title" className="text-base font-bold text-foreground">¿Tienes un código de asignación?</h2>
      <p className="mt-1 text-xs text-muted">Secretaría te lo entrega al inscribirte. Canjéalo para activar tu curso.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
        <Input
          label="Código"
          name="assignment-code"
          placeholder="Ej: UMG-2026-AB12"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          disabled={isLoading}
        />
        <Button type="submit" fullWidth isLoading={isLoading}>Canjear código</Button>
        {feedback && (
          <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-xs font-medium ${feedbackStyles[feedback.type]}`}>
            {feedback.text}
          </p>
        )}
      </form>
    </section>
  );
}

function QuickLinks() {
  const links = [
    { icon: '🔎', label: 'Explorar cursos', href: '/courses' },
    { icon: '👤', label: 'Mi perfil', href: '/profile' },
    { icon: '📝', label: 'Calificaciones', href: '/grades/student/101' },
    { icon: '📂', label: 'Recursos', href: '/resources' },
  ];

  return (
    <section
      aria-labelledby="quick-title"
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-surface p-5 shadow-sm"
    >
      <h2 id="quick-title" className="text-base font-bold text-foreground">Accesos rápidos</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {links.map((link) => (
          <Button key={link.label} variant="secondary" size="sm" href={maskRoute(link.href)} leftIcon={<span aria-hidden="true">{link.icon}</span>}>
            {link.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

function AnnouncementsCard({ announcements }) {
  return (
    <section
      aria-labelledby="news-title"
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-surface p-5 shadow-sm"
    >
      <h2 id="news-title" className="text-base font-bold text-foreground">Novedades</h2>
      {announcements.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No hay avisos por ahora. Te notificaremos cuando haya novedades.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {announcements.map((item) => (
            <li key={item.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.date && <p className="text-[11px] font-medium text-brand">{item.date}</p>}
              {item.text && <p className="mt-1 text-xs text-muted">{item.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HelpCard() {
  return (
    <section
      aria-labelledby="help-title"
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-surface p-5 shadow-sm"
    >
      <h2 id="help-title" className="text-base font-bold text-foreground">¿Necesitas ayuda?</h2>
      <p className="mt-1 text-xs text-muted">Revisa las preguntas frecuentes o conoce más sobre la plataforma.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" href={maskRoute('/faq')}>Preguntas frecuentes</Button>
        <Button size="sm" variant="ghost" href={maskRoute('/about')}>Acerca de UMG</Button>
      </div>
    </section>
  );
}

/* 9. ESQUELETO DE CARGA */
function DashboardSkeleton() {
  const block = 'animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800';
  return (
    <div className="space-y-8" role="status" aria-label="Cargando tu panel">
      <div className={`${block} h-44`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-24`} />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className={`${block} h-80 lg:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
    </div>
  );
}

export default StudentDashboard;
