'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button } from '@/components';
import VideoPlayer from '@/components/VideoPlayer';
import { ToastContainer, ToastMessage, ToastType } from '@/components/Toast';
import { maskRoute } from '@/utils/routeHasher';
import { VirtualClassroomActivities } from '@/app/dashboard/components/student/VirtualClassroomActivities';
import { extractResourceLinks } from '@/app/dashboard/utils';
import type {
  UserProfile,
  ModuleRecord,
  ContentRecord,
  AssignmentRecord,
  ExamRecord,
  EnrollmentRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  StatusFeedback,
} from '@/app/dashboard/types';

interface CourseDetailClassroomProps {
  courseId: string;
  courseTitle: string;
}

export default function CourseDetailClassroom({
  courseId,
  courseTitle,
}: CourseDetailClassroomProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<
    AssignmentSubmissionRecord[]
  >([]);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmissionRecord[]>(
    []
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [activeContentId, setActiveContentId] = useState<string>('');
  const [completedContentIds, setCompletedContentIds] = useState<string[]>([]);
  const [focusedTaskId, setFocusedTaskId] = useState<string>('');
  const [focusedExamId, setFocusedExamId] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFeedback = useCallback((fb: StatusFeedback) => {
    if (!fb?.message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [
      ...prev,
      { id, message: fb.message, type: fb.type as ToastType },
    ]);
  }, []);

  const loadCourseClassroomData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user || null;

      let loadedProfile: UserProfile | null = null;
      if (authUser) {
        const { data: userRow } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .eq('is_deleted', false)
          .maybeSingle();
        if (userRow) loadedProfile = userRow as UserProfile;

        const { data: enrollRow } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', authUser.id)
          .eq('course_id', courseId)
          .eq('is_deleted', false)
          .maybeSingle();
        if (enrollRow) setEnrollment(enrollRow as EnrollmentRecord);
      }
      setCurrentUser(loadedProfile);

      // Carga relacional de módulos con contenidos, tareas (assignments) y exámenes (exams)
      const { data: modsRelData, error: modsRelError } = await supabase
        .from('modules')
        .select('*, contents(*), assignments(*), exams(*)')
        .eq('course_id', courseId)
        .eq('is_deleted', false)
        .order('orden', { ascending: true });

      let mods: ModuleRecord[] = [];
      if (!modsRelError && modsRelData) {
        mods = (modsRelData as ModuleRecord[]).map((m) => ({
          ...m,
          contents: (m.contents || []).filter((c) => !c.is_deleted),
          assignments: (m.assignments || []).filter((a) => !a.is_deleted),
          exams: (m.exams || []).filter((ex) => !ex.is_deleted),
        }));
      } else {
        const { data: fallbackMods } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_deleted', false)
          .order('orden', { ascending: true });
        mods = (fallbackMods || []) as ModuleRecord[];
      }

      setModules(mods);
      const modIds = mods.map((m) => m.id);

      if (modIds.length > 0) {
        const [cRes, aRes, eRes, aSubRes, eSubRes] = await Promise.all([
          supabase
            .from('contents')
            .select('*')
            .in('module_id', modIds)
            .eq('is_deleted', false)
            .order('orden', { ascending: true }),
          supabase
            .from('assignments')
            .select('*')
            .in('module_id', modIds)
            .eq('is_deleted', false)
            .order('fecha_limite', { ascending: true }),
          supabase
            .from('exams')
            .select('*')
            .in('module_id', modIds)
            .eq('is_deleted', false)
            .order('fecha_apertura', { ascending: true }),
          authUser
            ? supabase
                .from('assignment_submissions')
                .select('*')
                .eq('student_id', authUser.id)
            : Promise.resolve({ data: [] }),
          authUser
            ? supabase
                .from('exam_submissions')
                .select('*')
                .eq('student_id', authUser.id)
            : Promise.resolve({ data: [] }),
        ]);

        const nestedC = mods.flatMap((m) => m.contents || []);
        const nestedA = mods.flatMap((m) => m.assignments || []);
        const nestedE = mods.flatMap((m) => m.exams || []);

        setContents(
          ((cRes.data && cRes.data.length > 0 ? cRes.data : nestedC) ||
            []) as ContentRecord[]
        );
        setAssignments(
          ((aRes.data && aRes.data.length > 0 ? aRes.data : nestedA) ||
            []) as AssignmentRecord[]
        );
        setExams(
          ((eRes.data && eRes.data.length > 0 ? eRes.data : nestedE) ||
            []) as ExamRecord[]
        );
        setAssignmentSubmissions(
          (aSubRes.data || []) as AssignmentSubmissionRecord[]
        );
        setExamSubmissions((eSubRes.data || []) as ExamSubmissionRecord[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCourseClassroomData();
  }, [loadCourseClassroomData]);

  const storageKey = currentUser
    ? `lms_completed_contents_${currentUser.id}`
    : `lms_completed_contents_guest_${courseId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedContentIds(parsed);
      }
    } catch {
      // Ignorar
    }
  }, [storageKey]);

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

  const activeContent = useMemo(() => {
    const filtered = selectedModuleId
      ? contents.filter((c) => c.module_id === selectedModuleId)
      : contents;
    return (
      contents.find((c) => c.id === activeContentId) ||
      filtered[0] ||
      contents[0] ||
      null
    );
  }, [contents, selectedModuleId, activeContentId]);

  const activeModule = useMemo(
    () =>
      modules.find((m) => m.id === selectedModuleId) ||
      modules.find((m) => m.id === activeContent?.module_id) ||
      modules[0] ||
      null,
    [modules, selectedModuleId, activeContent]
  );

  const progressMetrics = useMemo(() => {
    const lessonSet = new Set(completedContentIds);
    const completedLessonsCount = contents.filter((c) =>
      lessonSet.has(c.id)
    ).length;
    const submittedTasksCount = assignments.filter((a) =>
      submissionByAssignment.has(a.id)
    ).length;
    const passedExamsCount = exams.filter((ex) => {
      const sub = submissionByExam.get(ex.id);
      const maxScore = Number(ex.punteo_maximo) || 100;
      return sub !== undefined && Number(sub.calificacion_automatica) >= maxScore * 0.6;
    }).length;

    const totalItems = contents.length + assignments.length + exams.length;
    const completedItems =
      completedLessonsCount + submittedTasksCount + passedExamsCount;
    const percentage =
      totalItems > 0
        ? Math.min(100, Math.round((completedItems / totalItems) * 100))
        : enrollment?.progreso_porcentaje ?? 0;

    return {
      percentage,
      completedLessonsCount,
      totalLessonsCount: contents.length,
      submittedTasksCount,
      totalTasksCount: assignments.length,
      passedExamsCount,
      totalExamsCount: exams.length,
      totalItems,
      completedItems,
    };
  }, [
    completedContentIds,
    contents,
    assignments,
    exams,
    submissionByAssignment,
    submissionByExam,
    enrollment,
  ]);

  const handleToggleLessonCompleted = async (nextCompleted: boolean) => {
    if (!activeContent) return;
    const updatedSet = new Set(completedContentIds);
    if (nextCompleted) updatedSet.add(activeContent.id);
    else updatedSet.delete(activeContent.id);
    const nextArray = Array.from(updatedSet);
    setCompletedContentIds(nextArray);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextArray));
      } catch {
        // Ignorar
      }
    }

    const totalItems = contents.length + assignments.length + exams.length;
    const completedItems =
      contents.filter((c) => updatedSet.has(c.id)).length +
      progressMetrics.submittedTasksCount +
      progressMetrics.passedExamsCount;
    const nextPct =
      totalItems > 0
        ? Math.min(100, Math.round((completedItems / totalItems) * 100))
        : 0;

    if (enrollment) {
      await supabase
        .from('enrollments')
        .update({ progreso_porcentaje: nextPct })
        .eq('id', enrollment.id);
    }

    handleFeedback({
      type: 'success',
      message: `Progreso integral actualizado al ${nextPct}%.`,
    });
  };

  if (isLoading) {
    return (
      <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Cargando módulos, lecciones, tareas y evaluaciones del curso...
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Aula Virtual · Visor Integral del Curso
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {courseTitle}
          </h2>
        </div>
        <Button href={maskRoute('/dashboard?tab=my-courses')} variant="secondary" size="sm">
          Ir a Mi Panel Académico
        </Button>
      </div>

      {/* Barra de progreso integral */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-100">
            Avance integral ({progressMetrics.completedItems} de{' '}
            {progressMetrics.totalItems} actividades completadas)
          </span>
          <span className="text-sm font-black text-brand">
            {progressMetrics.percentage}%
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
            style={{ width: `${progressMetrics.percentage}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
            Lecciones completadas: {progressMetrics.completedLessonsCount} /{' '}
            {progressMetrics.totalLessonsCount}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
            Tareas entregadas: {progressMetrics.submittedTasksCount} /{' '}
            {progressMetrics.totalTasksCount}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
            Exámenes aprobados: {progressMetrics.passedExamsCount} /{' '}
            {progressMetrics.totalExamsCount}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        {/* Barra lateral de módulos con lecciones, tareas y evaluaciones */}
        <aside className="space-y-4">
          {modules.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              Este curso aún no tiene módulos publicados.
            </p>
          ) : (
            modules.map((mod) => {
              const modLessons = contents.filter((c) => c.module_id === mod.id);
              const modTasks = assignments.filter((a) => a.module_id === mod.id);
              const modExams = exams.filter((ex) => ex.module_id === mod.id);

              return (
                <div
                  key={mod.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedModuleId(mod.id)}
                    className="text-left text-xs font-bold uppercase tracking-wider text-brand hover:underline cursor-pointer"
                  >
                    Módulo {mod.orden}: {mod.titulo}
                  </button>

                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Lecciones ({modLessons.length})
                    </p>
                    {modLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => {
                          setSelectedModuleId(mod.id);
                          setActiveContentId(lesson.id);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                          activeContent?.id === lesson.id
                            ? 'bg-brand text-white'
                            : 'bg-white text-slate-800 hover:bg-slate-200/70 dark:bg-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <span className="truncate">
                          {lesson.orden}. {lesson.titulo}
                        </span>
                        {completedContentIds.includes(lesson.id) && <span>✓</span>}
                      </button>
                    ))}
                  </div>

                  {modTasks.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Tareas ({modTasks.length})
                      </p>
                      {modTasks.map((task) => {
                        const submitted = submissionByAssignment.has(task.id);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => {
                              setSelectedModuleId(mod.id);
                              setFocusedTaskId(task.id);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                          >
                            <span className="truncate">{task.titulo}</span>
                            <span className="text-[10px] font-bold text-brand">
                              {submitted ? '✓ Entregada' : 'Pendiente'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {modExams.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Evaluaciones ({modExams.length})
                      </p>
                      {modExams.map((exam) => {
                        const sub = submissionByExam.get(exam.id);
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => {
                              setSelectedModuleId(mod.id);
                              setFocusedExamId(exam.id);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                          >
                            <span className="truncate">
                              {exam.titulo} ({exam.tipo})
                            </span>
                            <span className="text-[10px] font-bold text-brand">
                              {sub ? `${sub.calificacion_automatica} pts` : 'Pendiente'}
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

        {/* Visor de lección y actividades */}
        <div className="space-y-4">
          {activeContent && (
            <>
              <VideoPlayer
                key={activeContent.id}
                url={activeContent.youtube_url || ''}
                title={activeContent.titulo}
                moduleName={activeModule?.titulo}
                isCompleted={completedContentIds.includes(activeContent.id)}
                onComplete={handleToggleLessonCompleted}
              />
              {activeContent.cuerpo && (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Notas y recursos de la lección
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {activeContent.cuerpo}
                  </p>
                  {extractResourceLinks(activeContent.cuerpo).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {extractResourceLinks(activeContent.cuerpo).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:underline dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          Abrir recurso externo
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              )}
            </>
          )}

          {currentUser ? (
            <VirtualClassroomActivities
              currentUser={currentUser}
              activeModule={activeModule}
              courseModules={modules}
              courseAssignments={assignments}
              courseExams={exams}
              submissionByAssignment={submissionByAssignment}
              submissionByExam={submissionByExam}
              focusedAssignmentId={focusedTaskId}
              focusedExamId={focusedExamId}
              onSelectAssignment={setFocusedTaskId}
              onSelectExam={setFocusedExamId}
              onActivityCompleted={async () => {
                await loadCourseClassroomData();
              }}
              onFeedback={handleFeedback}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Inicia sesión con tu cuenta estudiantil para enviar tareas ({assignments.length}) y realizar exámenes ({exams.length}) de este curso.
              </p>
              <div className="mt-3">
                <Button href={maskRoute('/login')} variant="brand" size="sm">
                  Iniciar sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
