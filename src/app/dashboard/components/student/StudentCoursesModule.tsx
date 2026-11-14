'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import CourseCard from '@/components/CourseCard';
import VideoPlayer from '@/components/VideoPlayer';
import { maskRoute, createMaskedUrl, encodeId } from '@/utils/routeHasher';
import { extractResourceLinks } from '../../utils';
import type {
  UserProfile,
  EnrollmentRecord,
  ModuleRecord,
  ContentRecord,
  StatusFeedback,
} from '../../types';

// =====================================================================
// Módulo 6 (student): Mis Cursos, Progreso y Acceso a Lecciones
// =====================================================================

export interface StudentCoursesModuleProps {
  currentUser: UserProfile;
  enrollments: EnrollmentRecord[];
  modules: ModuleRecord[];
  contents: ContentRecord[];
  selectedCourseId: string;
  selectedModuleId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function StudentCoursesModule({
  currentUser,
  enrollments,
  modules,
  contents,
  selectedCourseId,
  selectedModuleId,
  onSelectCourse,
  onSelectModule,
  onReloadStudentData,
  onFeedback,
}: StudentCoursesModuleProps) {
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string>('');
  const [completedContentIds, setCompletedContentIds] = useState<string[]>([]);

  const activeEnrollment = useMemo(
    () => enrollments.find((e) => e.course_id === selectedCourseId) || enrollments[0] || null,
    [enrollments, selectedCourseId]
  );

  const courseModules = useMemo(() => {
    if (!activeEnrollment) return [];
    return modules
      .filter((m) => m.course_id === activeEnrollment.course_id)
      .sort((a, b) => a.orden - b.orden);
  }, [modules, activeEnrollment]);

  const courseContents = useMemo(() => {
    const moduleOrderMap = new Map<string, number>();
    courseModules.forEach((m) => moduleOrderMap.set(m.id, m.orden));
    return contents
      .filter((c) => moduleOrderMap.has(c.module_id))
      .sort((a, b) => {
        const modDiff =
          (moduleOrderMap.get(a.module_id) ?? 0) -
          (moduleOrderMap.get(b.module_id) ?? 0);
        return modDiff !== 0 ? modDiff : a.orden - b.orden;
      });
  }, [contents, courseModules]);

  const visibleModuleContents = useMemo(() => {
    if (!selectedModuleId) return courseContents;
    return courseContents.filter((c) => c.module_id === selectedModuleId);
  }, [courseContents, selectedModuleId]);

  const activeContent = useMemo(
    () =>
      courseContents.find((c) => c.id === activeContentId) ||
      visibleModuleContents[0] ||
      courseContents[0] ||
      null,
    [courseContents, visibleModuleContents, activeContentId]
  );

  const activeModule = useMemo(
    () =>
      courseModules.find((m) => m.id === activeContent?.module_id) ||
      courseModules[0] ||
      null,
    [courseModules, activeContent]
  );

  const handleRedeemCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanCode = enrollmentCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsRedeeming(true);
    try {
      const { data: codeRow, error: codeError } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('codigo', cleanCode)
        .eq('tipo', 'course_enrollment')
        .eq('is_used', false)
        .eq('is_deleted', false)
        .maybeSingle();

      if (codeError) throw new Error(codeError.message);
      if (!codeRow || !codeRow.curso_id) {
        throw new Error(
          'Código de inscripción inválido, ya utilizado o sin curso asignado.'
        );
      }

      const { error: enrollError } = await supabase.from('enrollments').upsert(
        [
          {
            student_id: currentUser.id,
            course_id: codeRow.curso_id,
            progreso_porcentaje: 0,
            is_active: true,
            is_deleted: false,
          },
        ],
        { onConflict: 'student_id,course_id' }
      );

      if (enrollError) throw new Error(enrollError.message);

      await supabase
        .from('registration_codes')
        .update({ is_used: true, used_by: currentUser.id })
        .eq('id', codeRow.id);

      setEnrollmentCode('');
      onFeedback({
        type: 'success',
        message: 'Inscripción completada correctamente en el curso.',
      });
      await onReloadStudentData();
      onSelectCourse(codeRow.curso_id);
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo procesar el código de inscripción.',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleToggleLessonCompleted = async (nextCompleted: boolean) => {
    if (!activeContent || !activeEnrollment) return;

    const updatedSet = new Set(completedContentIds);
    if (nextCompleted) {
      updatedSet.add(activeContent.id);
    } else {
      updatedSet.delete(activeContent.id);
    }
    const nextArray = Array.from(updatedSet);
    setCompletedContentIds(nextArray);

    const totalLessons = Math.max(courseContents.length, 1);
    const completedInCourse = courseContents.filter((c) =>
      updatedSet.has(c.id)
    ).length;
    const computedProgress = Math.min(
      100,
      Math.max(
        nextCompleted ? Math.round((completedInCourse / totalLessons) * 100) : 0,
        nextCompleted ? activeEnrollment.progreso_porcentaje : 0
      )
    );
    const finalProgress =
      completedInCourse > 0
        ? Math.round((completedInCourse / totalLessons) * 100)
        : nextCompleted
        ? 100
        : computedProgress;

    const { error } = await supabase
      .from('enrollments')
      .update({ progreso_porcentaje: finalProgress })
      .eq('id', activeEnrollment.id);

    if (error) {
      onFeedback({
        type: 'error',
        message: `No se pudo actualizar tu progreso: ${error.message}`,
      });
      return;
    }

    onFeedback({
      type: 'success',
      message: `Progreso actualizado al ${finalProgress}% en ${
        activeEnrollment.courses?.titulo || 'tu curso'
      }.`,
    });
    await onReloadStudentData();
  };

  const currentIndex = activeContent
    ? courseContents.findIndex((c) => c.id === activeContent.id)
    : -1;

  return (
    <div className="space-y-8">
      {/* Canje rápido de código de inscripción */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Inscripciones activas (`enrollments`)
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Mis cursos inscritos ({enrollments.length})
            </h2>
          </div>

          <form
            onSubmit={handleRedeemCode}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <Input
              label="Código de inscripción a curso"
              value={enrollmentCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEnrollmentCode(e.target.value.toUpperCase())
              }
              placeholder="UMG-CRS-XXXXXXXX"
            />
            <Button type="submit" variant="brand" isLoading={isRedeeming}>
              Canjear código
            </Button>
          </form>
        </div>

        {enrollments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-foreground">
              Aún no tienes inscripciones activas
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Canjea un código de inscripción emitido por administración o explora el catálogo institucional.
            </p>
            <div className="mt-4">
              <Button href={maskRoute('/courses')} variant="brand">
                Explorar catálogo de cursos
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses;
              const courseId = enrollment.course_id;
              const courseModulesCount = modules.filter(
                (m) => m.course_id === courseId
              ).length;
              const courseLessonsCount = contents.filter((c) =>
                modules.some((m) => m.course_id === courseId && m.id === c.module_id)
              ).length;

              return (
                <div key={enrollment.id} className="space-y-3">
                  <CourseCard
                    course={{
                      id: courseId,
                      title: course?.titulo || 'Curso UMG',
                      description:
                        course?.descripcion ||
                        'Curso académico activo en Campus Cobán.',
                      thumbnail: course?.thumbnail || null,
                      category: 'Campus Cobán',
                      level: `${courseModulesCount} módulos`,
                      duration: `Nota: ${enrollment.calificacion_final ?? 0}`,
                      lessonsCount: courseLessonsCount,
                      rating: 5.0,
                      reviewsCount: 0,
                      instructor: {
                        name: 'Docente UMG',
                        avatar: null,
                        title: course?.codigo_asignacion || 'Curso Activo',
                      },
                    }}
                    progress={enrollment.progreso_porcentaje}
                    isEnrolled
                    actionText="Ver detalles del curso"
                    actionHref={createMaskedUrl('/courses', courseId)}
                  />
                  <Button
                    variant={
                      activeEnrollment?.course_id === courseId
                        ? 'success'
                        : 'secondary'
                    }
                    fullWidth
                    size="sm"
                    onClick={() => {
                      onSelectCourse(courseId);
                      onSelectModule('');
                      setActiveContentId('');
                    }}
                  >
                    {activeEnrollment?.course_id === courseId
                      ? 'Aula abierta abajo'
                      : 'Abrir lecciones en panel'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visor de Módulos y Lecciones del Curso Seleccionado */}
      {activeEnrollment && (
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Aula virtual · Progreso {activeEnrollment.progreso_porcentaje}%
              </p>
              <h3 className="mt-1 text-2xl font-black text-foreground">
                {activeEnrollment.courses?.titulo || 'Contenido del curso'}
              </h3>
            </div>
            <Button
              href={maskRoute(`/courses/${activeEnrollment.course_id}`)}
              variant="secondary"
              size="sm"
            >
              Ficha del curso
            </Button>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
              {courseModules.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  El docente aún no ha publicado módulos para este curso.
                </p>
              ) : (
                courseModules.map((mod) => {
                  const modContents = courseContents.filter(
                    (c) => c.module_id === mod.id
                  );
                  return (
                    <div
                      key={mod.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={maskRoute(
                            `/dashboard?tab=my-courses&course=${encodeId(
                              activeEnrollment.course_id
                            )}&module=${encodeId(mod.id)}`
                          )}
                          onClick={() => onSelectModule(mod.id)}
                          className="text-xs font-bold uppercase tracking-wider text-brand hover:underline"
                        >
                          Módulo {mod.orden}: {mod.titulo}
                        </Link>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {modContents.map((lesson) => {
                          const isCurrent = activeContent?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => setActiveContentId(lesson.id)}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                isCurrent
                                  ? 'bg-brand text-white'
                                  : 'bg-surface text-foreground hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                              }`}
                            >
                              <span className="truncate">
                                {lesson.orden}. {lesson.titulo}
                              </span>
                              {completedContentIds.includes(lesson.id) && (
                                <span>✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </aside>

            <div className="space-y-4">
              {activeContent ? (
                <>
                  <VideoPlayer
                    key={activeContent.id}
                    url={activeContent.youtube_url || ''}
                    title={activeContent.titulo}
                    moduleName={activeModule?.titulo}
                    isCompleted={completedContentIds.includes(activeContent.id)}
                    onComplete={handleToggleLessonCompleted}
                    onPrev={
                      currentIndex > 0
                        ? () =>
                            setActiveContentId(courseContents[currentIndex - 1].id)
                        : undefined
                    }
                    onNext={
                      currentIndex >= 0 &&
                      currentIndex < courseContents.length - 1
                        ? () =>
                            setActiveContentId(courseContents[currentIndex + 1].id)
                        : undefined
                    }
                  />
                  {activeContent.cuerpo && (
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                      <h4 className="text-sm font-bold text-foreground">
                        Notas y recursos de la lección
                      </h4>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {activeContent.cuerpo}
                      </p>
                      {extractResourceLinks(activeContent.cuerpo).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {extractResourceLinks(activeContent.cuerpo).map(
                            (resourceUrl) => (
                              <a
                                key={resourceUrl}
                                href={resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:underline dark:bg-blue-500/10 dark:text-blue-300"
                              >
                                Abrir recurso externo
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </article>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Selecciona una lección para iniciar la reproducción y registrar tu avance.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
