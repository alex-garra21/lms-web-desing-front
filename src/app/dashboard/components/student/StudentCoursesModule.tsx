'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import CourseCard from '@/components/CourseCard';
import VideoPlayer from '@/components/VideoPlayer';
import { maskRoute, createMaskedUrl, encodeId } from '@/utils/routeHasher';
import { extractResourceLinks } from '../../utils';
import { VirtualClassroomActivities } from './VirtualClassroomActivities';
import type {
  UserProfile,
  EnrollmentRecord,
  ModuleRecord,
  ContentRecord,
  AssignmentRecord,
  ExamRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  StatusFeedback,
} from '../../types';

// =====================================================================
// Módulo 6 (student): Mis Cursos, Aula Virtual y Progreso Integral
// =====================================================================

export interface StudentCoursesModuleProps {
  currentUser: UserProfile;
  enrollments: EnrollmentRecord[];
  modules: ModuleRecord[];
  contents: ContentRecord[];
  assignments?: AssignmentRecord[];
  exams?: ExamRecord[];
  assignmentSubmissions?: AssignmentSubmissionRecord[];
  examSubmissions?: ExamSubmissionRecord[];
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
  assignments = [],
  exams = [],
  assignmentSubmissions = [],
  examSubmissions = [],
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
  const [focusedTaskInAula, setFocusedTaskInAula] = useState<string>('');
  const [focusedExamInAula, setFocusedExamInAula] = useState<string>('');

  const activeEnrollment = useMemo(
    () =>
      enrollments.find((e) => e.course_id === selectedCourseId) ||
      enrollments[0] ||
      null,
    [enrollments, selectedCourseId]
  );

  // Persistencia local de lecciones marcadas como completadas por estudiante
  const storageKey = `lms_completed_contents_${currentUser.id}`;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedContentIds(parsed);
      }
    } catch {
      // Ignorar errores de lectura de localStorage
    }
  }, [storageKey]);

  const saveCompletedLessons = useCallback(
    (ids: string[]) => {
      setCompletedContentIds(ids);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(ids));
        } catch {
          // Ignorar errores de escritura
        }
      }
    },
    [storageKey]
  );

  // Unificar colecciones relacionales (directas + anidadas en modules)
  const allContents = useMemo(() => {
    const map = new Map<string, ContentRecord>();
    modules.forEach((m) =>
      (m.contents || []).forEach((c) => {
        if (!c.is_deleted) map.set(c.id, c);
      })
    );
    contents.forEach((c) => {
      if (!c.is_deleted) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [modules, contents]);

  const allAssignments = useMemo(() => {
    const map = new Map<string, AssignmentRecord>();
    modules.forEach((m) =>
      (m.assignments || []).forEach((a) => {
        if (!a.is_deleted) map.set(a.id, a);
      })
    );
    assignments.forEach((a) => {
      if (!a.is_deleted) map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [modules, assignments]);

  const allExams = useMemo(() => {
    const map = new Map<string, ExamRecord>();
    modules.forEach((m) =>
      (m.exams || []).forEach((ex) => {
        if (!ex.is_deleted) map.set(ex.id, ex);
      })
    );
    exams.forEach((ex) => {
      if (!ex.is_deleted) map.set(ex.id, ex);
    });
    return Array.from(map.values());
  }, [modules, exams]);

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentSubmissionRecord>();
    assignmentSubmissions.forEach((s) => map.set(s.assignment_id, s));
    return map;
  }, [assignmentSubmissions]);

  const submissionByExam = useMemo(() => {
    const map = new Map<string, ExamSubmissionRecord>();
    examSubmissions.forEach((s) => map.set(s.exam_id, s));
    return map;
  }, [examSubmissions]);

  const courseModules = useMemo(() => {
    if (!activeEnrollment) return [];
    return modules
      .filter((m) => m.course_id === activeEnrollment.course_id)
      .sort((a, b) => a.orden - b.orden);
  }, [modules, activeEnrollment]);

  const courseModuleIdSet = useMemo(
    () => new Set(courseModules.map((m) => m.id)),
    [courseModules]
  );

  const courseContents = useMemo(() => {
    const moduleOrderMap = new Map<string, number>();
    courseModules.forEach((m) => moduleOrderMap.set(m.id, m.orden));
    return allContents
      .filter((c) => moduleOrderMap.has(c.module_id))
      .sort((a, b) => {
        const modDiff =
          (moduleOrderMap.get(a.module_id) ?? 0) -
          (moduleOrderMap.get(b.module_id) ?? 0);
        return modDiff !== 0 ? modDiff : a.orden - b.orden;
      });
  }, [allContents, courseModules]);

  const courseAssignments = useMemo(
    () => allAssignments.filter((a) => courseModuleIdSet.has(a.module_id)),
    [allAssignments, courseModuleIdSet]
  );

  const courseExams = useMemo(
    () => allExams.filter((ex) => courseModuleIdSet.has(ex.module_id)),
    [allExams, courseModuleIdSet]
  );

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
      courseModules.find((m) => m.id === selectedModuleId) ||
      courseModules.find((m) => m.id === activeContent?.module_id) ||
      courseModules[0] ||
      null,
    [courseModules, selectedModuleId, activeContent]
  );

  // Cálculo integral de progreso por curso (lecciones completadas + tareas entregadas + exámenes aprobados)
  const computeCourseMetrics = useCallback(
    (
      targetCourseId: string,
      overrideLessonIds?: string[],
      extraAssignmentId?: string,
      extraExamSubmission?: { examId: string; score: number }
    ) => {
      const lessonIdsSet = new Set(overrideLessonIds ?? completedContentIds);
      const cMods = modules.filter((m) => m.course_id === targetCourseId);
      const cModIds = new Set(cMods.map((m) => m.id));

      const cLessons = allContents.filter((c) => cModIds.has(c.module_id));
      const cTasks = allAssignments.filter((a) => cModIds.has(a.module_id));
      const cExams = allExams.filter((ex) => cModIds.has(ex.module_id));

      const completedLessonsCount = cLessons.filter((c) =>
        lessonIdsSet.has(c.id)
      ).length;

      const submittedTasksCount = cTasks.filter(
        (a) =>
          submissionByAssignment.has(a.id) || a.id === extraAssignmentId
      ).length;

      const passedExamsCount = cExams.filter((ex) => {
        const maxScore = Number(ex.punteo_maximo) || 100;
        if (extraExamSubmission && extraExamSubmission.examId === ex.id) {
          return extraExamSubmission.score >= maxScore * 0.6;
        }
        const sub = submissionByExam.get(ex.id);
        return sub !== undefined && Number(sub.calificacion_automatica) >= maxScore * 0.6;
      }).length;

      const totalItems = cLessons.length + cTasks.length + cExams.length;
      const completedItems =
        completedLessonsCount + submittedTasksCount + passedExamsCount;

      const enrollmentRow = enrollments.find(
        (e) => e.course_id === targetCourseId
      );
      const fallbackPct = enrollmentRow?.progreso_porcentaje ?? 0;

      const percentage =
        totalItems > 0
          ? Math.min(100, Math.round((completedItems / totalItems) * 100))
          : fallbackPct;

      return {
        percentage,
        completedLessonsCount,
        totalLessonsCount: cLessons.length,
        submittedTasksCount,
        totalTasksCount: cTasks.length,
        passedExamsCount,
        totalExamsCount: cExams.length,
        totalItems,
        completedItems,
      };
    },
    [
      completedContentIds,
      modules,
      allContents,
      allAssignments,
      allExams,
      submissionByAssignment,
      submissionByExam,
      enrollments,
    ]
  );

  const activeProgressSummary = useMemo(
    () =>
      activeEnrollment
        ? computeCourseMetrics(activeEnrollment.course_id)
        : null,
    [activeEnrollment, computeCourseMetrics]
  );

  const syncIntegralProgressToDb = useCallback(
    async (
      enrollment: EnrollmentRecord,
      overrideLessonIds?: string[],
      extraAssignmentId?: string,
      extraExamSubmission?: { examId: string; score: number }
    ) => {
      const metrics = computeCourseMetrics(
        enrollment.course_id,
        overrideLessonIds,
        extraAssignmentId,
        extraExamSubmission
      );
      await supabase
        .from('enrollments')
        .update({ progreso_porcentaje: metrics.percentage })
        .eq('id', enrollment.id);
      return metrics;
    },
    [computeCourseMetrics]
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
    saveCompletedLessons(nextArray);

    const metrics = await syncIntegralProgressToDb(activeEnrollment, nextArray);

    onFeedback({
      type: 'success',
      message: `Progreso integral actualizado al ${metrics.percentage}% en ${
        activeEnrollment.courses?.titulo || 'tu curso'
      }.`,
    });
    await onReloadStudentData();
  };

  const handleActivityCompleted = async (opts?: {
    newSubmittedAssignmentId?: string;
    newExamSubmission?: { examId: string; score: number };
  }) => {
    if (activeEnrollment) {
      await syncIntegralProgressToDb(
        activeEnrollment,
        undefined,
        opts?.newSubmittedAssignmentId,
        opts?.newExamSubmission
      );
    }
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
              const metrics = computeCourseMetrics(courseId);
              const courseModulesCount = modules.filter(
                (m) => m.course_id === courseId
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
                      duration: `Avance: ${metrics.percentage}%`,
                      lessonsCount: metrics.totalLessonsCount,
                      rating: 5.0,
                      reviewsCount: 0,
                      instructor: {
                        name: 'Docente UMG',
                        avatar: null,
                        title: course?.codigo_asignacion || 'Curso Activo',
                      },
                    }}
                    progress={metrics.percentage}
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
                      : 'Abrir lecciones y actividades en panel'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visor de Módulos, Lecciones, Tareas y Exámenes del Curso Seleccionado */}
      {activeEnrollment && activeProgressSummary && (
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Aula virtual · Progreso integral {activeProgressSummary.percentage}%
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

          {/* Barra de Progreso Integral (Lecciones + Tareas + Exámenes) */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-foreground">
                Avance integral del curso ({activeProgressSummary.completedItems} de{' '}
                {activeProgressSummary.totalItems} actividades completadas)
              </span>
              <span className="text-sm font-black text-brand">
                {activeProgressSummary.percentage}%
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
                style={{ width: `${activeProgressSummary.percentage}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                Lecciones completadas: {activeProgressSummary.completedLessonsCount} /{' '}
                {activeProgressSummary.totalLessonsCount}
              </span>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                Tareas entregadas: {activeProgressSummary.submittedTasksCount} /{' '}
                {activeProgressSummary.totalTasksCount}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                Exámenes aprobados: {activeProgressSummary.passedExamsCount} /{' '}
                {activeProgressSummary.totalExamsCount}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
            {/* Barra lateral de navegación de módulos con lecciones, tareas y exámenes */}
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
                  const modAssignments = courseAssignments.filter(
                    (a) => a.module_id === mod.id
                  );
                  const modExams = courseExams.filter(
                    (ex) => ex.module_id === mod.id
                  );

                  const pendingTasksInMod = modAssignments.filter(
                    (a) => !submissionByAssignment.has(a.id)
                  ).length;
                  const pendingExamsInMod = modExams.filter((ex) => {
                    const sub = submissionByExam.get(ex.id);
                    const maxScore = Number(ex.punteo_maximo) || 100;
                    return !sub || Number(sub.calificacion_automatica) < maxScore * 0.6;
                  }).length;
                  const totalPendingInMod = pendingTasksInMod + pendingExamsInMod;

                  return (
                    <div
                      key={mod.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        activeModule?.id === mod.id
                          ? 'border-brand/60 bg-blue-50/30 dark:border-brand/50 dark:bg-slate-800/80'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
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
                        {totalPendingInMod > 0 ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            {totalPendingInMod} pend.
                          </span>
                        ) : modAssignments.length + modExams.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Al día
                          </span>
                        ) : null}
                      </div>

                      {/* Lecciones del módulo */}
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Lecciones ({modContents.length})
                        </p>
                        {modContents.map((lesson) => {
                          const isCurrent = activeContent?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => {
                                onSelectModule(mod.id);
                                setActiveContentId(lesson.id);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
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

                      {/* Tareas del módulo en la barra lateral */}
                      {modAssignments.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/70">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Tareas ({modAssignments.length})
                          </p>
                          {modAssignments.map((task) => {
                            const submitted = submissionByAssignment.has(task.id);
                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => {
                                  onSelectModule(mod.id);
                                  setFocusedTaskInAula(task.id);
                                  const el = document.getElementById(
                                    `aula-task-${task.id}`
                                  );
                                  el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-surface px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-brand dark:border-slate-700 cursor-pointer"
                              >
                                <span className="truncate">{task.titulo}</span>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    submitted
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                  }`}
                                >
                                  {submitted ? '✓ Entregada' : 'Pendiente'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Evaluaciones / Exámenes del módulo en la barra lateral */}
                      {modExams.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/70">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Evaluaciones ({modExams.length})
                          </p>
                          {modExams.map((exam) => {
                            const sub = submissionByExam.get(exam.id);
                            const maxScore = Number(exam.punteo_maximo) || 100;
                            const approved =
                              sub !== undefined &&
                              Number(sub.calificacion_automatica) >= maxScore * 0.6;
                            return (
                              <button
                                key={exam.id}
                                type="button"
                                onClick={() => {
                                  onSelectModule(mod.id);
                                  setFocusedExamInAula(exam.id);
                                  const el = document.getElementById(
                                    `aula-exam-${exam.id}`
                                  );
                                  el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-surface px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-brand dark:border-slate-700 cursor-pointer"
                              >
                                <span className="truncate">
                                  {exam.titulo} ({exam.tipo})
                                </span>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    approved
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                      : sub
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                  }`}
                                >
                                  {approved
                                    ? '✓ Aprobado'
                                    : sub
                                    ? `${sub.calificacion_automatica} pts`
                                    : 'Pendiente'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </aside>

            {/* Vista principal de la lección + Tareas y Exámenes del módulo */}
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

              {/* Apartados interactivos de Tareas (assignments) y Exámenes (exams) */}
              <VirtualClassroomActivities
                currentUser={currentUser}
                activeModule={activeModule}
                courseModules={courseModules}
                courseAssignments={courseAssignments}
                courseExams={courseExams}
                submissionByAssignment={submissionByAssignment}
                submissionByExam={submissionByExam}
                focusedAssignmentId={focusedTaskInAula}
                focusedExamId={focusedExamInAula}
                onSelectAssignment={setFocusedTaskInAula}
                onSelectExam={setFocusedExamInAula}
                onActivityCompleted={handleActivityCompleted}
                onFeedback={onFeedback}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
