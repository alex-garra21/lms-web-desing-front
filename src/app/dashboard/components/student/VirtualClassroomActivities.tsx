'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import { formatDateTime, buildSubmissionStoragePath } from '../../utils';
import { SAMPLE_QUESTIONS } from '../../constants';
import type {
  UserProfile,
  ModuleRecord,
  AssignmentRecord,
  ExamRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  StatusFeedback,
} from '../../types';

export interface VirtualClassroomActivitiesProps {
  currentUser: UserProfile;
  activeModule: ModuleRecord | null;
  courseModules: ModuleRecord[];
  courseAssignments: AssignmentRecord[];
  courseExams: ExamRecord[];
  submissionByAssignment: Map<string, AssignmentSubmissionRecord>;
  submissionByExam: Map<string, ExamSubmissionRecord>;
  focusedAssignmentId?: string;
  focusedExamId?: string;
  onSelectAssignment?: (assignmentId: string) => void;
  onSelectExam?: (examId: string) => void;
  onActivityCompleted: (opts?: {
    newSubmittedAssignmentId?: string;
    newExamSubmission?: { examId: string; score: number };
  }) => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function VirtualClassroomActivities({
  currentUser,
  activeModule,
  courseModules,
  courseAssignments,
  courseExams,
  submissionByAssignment,
  submissionByExam,
  focusedAssignmentId = '',
  focusedExamId = '',
  onSelectAssignment,
  onSelectExam,
  onActivityCompleted,
  onFeedback,
}: VirtualClassroomActivitiesProps) {
  const [scope, setScope] = useState<'module' | 'course'>('module');
  const [openAssignmentId, setOpenAssignmentId] = useState<string>('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [activeExamId, setActiveExamId] = useState<string>('');
  const [nfcVerifiedForExam, setNfcVerifiedForExam] = useState<
    Record<string, boolean>
  >({});
  const [isWaitingNfc, setIsWaitingNfc] = useState(false);
  const [isPollingReady, setIsPollingReady] = useState(false);
  const [nfcVerifiedBanner, setNfcVerifiedBanner] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  const effectiveAssignmentId = openAssignmentId || focusedAssignmentId;
  const effectiveExamId = activeExamId || focusedExamId;

  const moduleNameMap = new Map<string, string>();
  courseModules.forEach((m) =>
    moduleNameMap.set(m.id, `Módulo ${m.orden}: ${m.titulo}`)
  );

  const visibleAssignments =
    scope === 'module' && activeModule
      ? courseAssignments.filter((a) => a.module_id === activeModule.id)
      : courseAssignments;

  const visibleExams =
    scope === 'module' && activeModule
      ? courseExams.filter((ex) => ex.module_id === activeModule.id)
      : courseExams;

  const activeExam =
    courseExams.find((ex) => ex.id === effectiveExamId) || null;

  const completeNfcVerification = useCallback(
    (examId: string, customMessage?: string) => {
      setNfcVerifiedForExam((prev) => ({ ...prev, [examId]: true }));
      setIsWaitingNfc(false);
      setIsPollingReady(false);
      const msg = customMessage || '¡Asistencia NFC verificada con éxito!';
      setNfcVerifiedBanner(msg);
      onFeedback({
        type: 'success',
        message: msg,
      });
    },
    [onFeedback]
  );

  // Suscripción Supabase Realtime + intervalo de sondeo (cada 2s) cuando está activo "Acercando al lector de laboratorio..."
  useEffect(() => {
    if (!isWaitingNfc || !isPollingReady || !activeExam) return;

    const examId = activeExam.id;
    let isCancelled = false;

    const channel = supabase
      .channel(`aula-nfc-attendance-${currentUser.id}-${examId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_attendances',
          filter: `student_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (isCancelled) return;
          const newRow = payload.new as {
            exam_id?: string;
            nfc_verified?: boolean;
            status?: string;
          } | null;

          if (
            newRow &&
            (!newRow.exam_id || newRow.exam_id === examId) &&
            (newRow.nfc_verified === true || newRow.status === 'verified')
          ) {
            completeNfcVerification(examId, '¡Asistencia NFC verificada con éxito!');
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const params = new URLSearchParams({
          student_id: currentUser.id,
          exam_id: examId,
        });
        const res = await fetch(`/api/nfc/validar?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (
          !isCancelled &&
          data?.ok &&
          (data?.verified === true || data?.status === 'verified')
        ) {
          completeNfcVerification(examId, '¡Asistencia NFC verificada con éxito!');
        }
      } catch {
        // Ignorar errores transitorios de red
      }
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [
    isWaitingNfc,
    isPollingReady,
    activeExam,
    currentUser.id,
    completeNfcVerification,
  ]);

  const handleOpenAssignmentForm = (task: AssignmentRecord) => {
    const existing = submissionByAssignment.get(task.id);
    if (effectiveAssignmentId === task.id) {
      setOpenAssignmentId('');
      onSelectAssignment?.('');
      return;
    }
    setOpenAssignmentId(task.id);
    onSelectAssignment?.(task.id);
    setSubmissionLink(existing?.archivo_url || '');
    setSubmissionText(existing?.comentario || '');
    setSelectedFile(null);
  };

  const handleSubmitAssignment = async (
    e: React.FormEvent<HTMLFormElement>,
    task: AssignmentRecord
  ) => {
    e.preventDefault();
    const cleanLink = submissionLink.trim();
    const cleanText = submissionText.trim();

    if (!cleanLink && !cleanText && !selectedFile) {
      onFeedback({
        type: 'error',
        message:
          'Ingresa un enlace o escribe el texto de tu entregable antes de enviarlo.',
      });
      return;
    }

    setIsSubmittingTask(true);
    try {
      let finalFileUrl = cleanLink;

      if (selectedFile) {
        const storagePath = buildSubmissionStoragePath(
          currentUser.id,
          task.id,
          selectedFile.name
        );
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(storagePath, selectedFile, { upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('submissions')
            .getPublicUrl(storagePath);
          finalFileUrl = publicData.publicUrl;
        } else if (!finalFileUrl) {
          finalFileUrl = `storage://submissions/${storagePath}`;
        }
      }

      const payload = {
        assignment_id: task.id,
        student_id: currentUser.id,
        archivo_url: finalFileUrl || cleanText,
        comentario: cleanText || null,
      };

      const { error } = await supabase
        .from('assignment_submissions')
        .upsert([payload], { onConflict: 'assignment_id,student_id' });

      if (error) throw new Error(error.message);

      setSelectedFile(null);
      setSubmissionLink('');
      setSubmissionText('');
      setOpenAssignmentId('');
      onSelectAssignment?.('');

      onFeedback({
        type: 'success',
        message: `Entregable registrado en assignment_submissions para "${task.titulo}".`,
      });

      await onActivityCompleted({ newSubmittedAssignmentId: task.id });
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo registrar la entrega de la tarea.',
      });
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleVerifyNfc = async (exam: ExamRecord) => {
    setActiveExamId(exam.id);
    onSelectExam?.(exam.id);
    setIsWaitingNfc(true);
    setIsPollingReady(false);
    setNfcVerifiedBanner('');

    onFeedback({
      type: 'info',
      message: 'Acercando al lector de laboratorio...',
    });

    try {
      await fetch('/api/nfc/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_wait',
          student_id: currentUser.id,
          exam_id: exam.id,
        }),
      });
    } catch {
      // Continuar con el sondeo y escucha en tiempo real
    } finally {
      setIsPollingReady(true);
    }
  };

  const handleSubmitExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeExam) return;

    const isPresencial = activeExam.modalidad === 'presencial';
    const isVerified = isPresencial
      ? Boolean(nfcVerifiedForExam[activeExam.id])
      : true;

    if (isPresencial && !isVerified) {
      onFeedback({
        type: 'error',
        message:
          'Debes validar tu asistencia NFC antes de enviar un examen presencial.',
      });
      return;
    }

    const correctCount = SAMPLE_QUESTIONS.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);

    const maxScore = Number(activeExam.punteo_maximo) || 100;
    const computedScore = Number(
      ((correctCount / SAMPLE_QUESTIONS.length) * maxScore).toFixed(2)
    );

    setIsSubmittingExam(true);
    try {
      const { error } = await supabase.from('exam_submissions').upsert(
        [
          {
            exam_id: activeExam.id,
            student_id: currentUser.id,
            calificacion_automatica: computedScore,
            asistencia_verificada: isVerified,
          },
        ],
        { onConflict: 'exam_id,student_id' }
      );

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: `Evaluación enviada. Calificación obtenida: ${computedScore} / ${maxScore} pts.`,
      });

      const completedExamId = activeExam.id;
      setActiveExamId('');
      onSelectExam?.('');
      setAnswers({});

      await onActivityCompleted({
        newExamSubmission: { examId: completedExamId, score: computedScore },
      });
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo enviar el examen.',
      });
    } finally {
      setIsSubmittingExam(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Encabezado y filtro de alcance (Módulo actual vs. Curso completo) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Actividades académicas integradas
          </p>
          <h4 className="text-sm font-black text-foreground">
            {scope === 'module' && activeModule
              ? `Tareas y evaluaciones · Módulo ${activeModule.orden}: ${activeModule.titulo}`
              : 'Todas las tareas y evaluaciones del curso'}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScope('module')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              scope === 'module'
                ? 'bg-brand text-white'
                : 'bg-surface text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Módulo actual ({
              courseAssignments.filter((a) => a.module_id === activeModule?.id)
                .length +
                courseExams.filter((ex) => ex.module_id === activeModule?.id)
                  .length
            })
          </button>
          <button
            type="button"
            onClick={() => setScope('course')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              scope === 'course'
                ? 'bg-brand text-white'
                : 'bg-surface text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Todo el curso ({courseAssignments.length + courseExams.length})
          </button>
        </div>
      </div>

      {/* Apartado de Tareas (assignments) */}
      <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
              Entregables (`assignments` → `assignment_submissions`)
            </span>
            <h5 className="mt-0.5 text-base font-black text-foreground">
              Tareas del módulo ({visibleAssignments.length})
            </h5>
          </div>
        </div>

        {visibleAssignments.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            No hay tareas registradas en este módulo.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleAssignments.map((task) => {
              const existing = submissionByAssignment.get(task.id);
              const isOpen = effectiveAssignmentId === task.id;
              const isGraded =
                existing?.calificacion !== null &&
                existing?.calificacion !== undefined;

              return (
                <article
                  key={task.id}
                  id={`aula-task-${task.id}`}
                  className={`rounded-2xl border p-4 transition-all ${
                    isOpen
                      ? 'border-brand bg-blue-50/40 dark:border-brand dark:bg-blue-950/20'
                      : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-brand">
                      {moduleNameMap.get(task.module_id) || 'Módulo'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        Máx: {task.punteo_maximo} pts
                      </span>
                      {isGraded ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                          Calificada: {existing.calificacion} / {task.punteo_maximo} pts
                        </span>
                      ) : existing ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                          ✓ Entregada
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                          Pendiente de entrega
                        </span>
                      )}
                    </div>
                  </div>

                  <h6 className="mt-2 text-sm font-extrabold text-foreground">
                    {task.titulo}
                  </h6>
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {task.descripcion}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-700/70">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Fecha límite: {formatDateTime(task.fecha_limite)}
                    </span>
                    <Button
                      variant={isOpen ? 'ghost' : existing ? 'secondary' : 'brand'}
                      size="sm"
                      onClick={() => handleOpenAssignmentForm(task)}
                    >
                      {isOpen
                        ? 'Cerrar formulario'
                        : existing
                        ? 'Actualizar entregable'
                        : 'Enviar entregable'}
                    </Button>
                  </div>

                  {existing && !isOpen && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-surface p-3 text-xs dark:border-slate-700">
                      <p className="font-semibold text-foreground">
                        Tu entrega registrada:
                      </p>
                      {existing.archivo_url && (
                        <p className="mt-1 truncate font-mono text-[11px] text-brand">
                          {existing.archivo_url}
                        </p>
                      )}
                      {existing.comentario && (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          {existing.comentario}
                        </p>
                      )}
                    </div>
                  )}

                  {isOpen && (
                    <form
                      onSubmit={(e) => handleSubmitAssignment(e, task)}
                      className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"
                    >
                      <Input
                        label="Enlace del entregable (URL de repositorio, Drive o documento)"
                        value={submissionLink}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubmissionLink(e.target.value)
                        }
                        placeholder="https://drive.google.com/... o https://github.com/..."
                      />

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Respuesta en texto o comentarios del entregable
                        </label>
                        <textarea
                          rows={3}
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Escribe aquí el texto de tu entrega, resumen de solución o notas para el docente..."
                          className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-xs text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Archivo adjunto opcional (PDF, ZIP, DOCX)
                        </label>
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs text-foreground dark:border-slate-700"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="submit"
                          variant="brand"
                          size="sm"
                          isLoading={isSubmittingTask}
                        >
                          Registrar entrega en el curso
                        </Button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Apartado de Exámenes (exams) */}
      <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Evaluaciones programadas (`exams` → `exam_submissions`)
          </span>
          <h5 className="mt-0.5 text-base font-black text-foreground">
            Exámenes del módulo ({visibleExams.length})
          </h5>
        </div>

        {visibleExams.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            No hay exámenes programados en este módulo.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleExams.map((exam) => {
              const existing = submissionByExam.get(exam.id);
              const maxPoints = Number(exam.punteo_maximo) || 100;
              const isApproved =
                existing !== undefined &&
                Number(existing.calificacion_automatica) >= maxPoints * 0.6;
              const isPresencial = exam.modalidad === 'presencial';
              const isSelected = effectiveExamId === exam.id;

              return (
                <article
                  key={exam.id}
                  id={`aula-exam-${exam.id}`}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-brand bg-blue-50/40 dark:border-brand dark:bg-blue-950/20'
                      : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                        {exam.tipo === 'final' ? 'Examen Final' : 'Examen Parcial'} ·{' '}
                        {isPresencial ? 'Presencial (NFC)' : 'Virtual'}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {exam.punteo_maximo} pts
                      </span>
                    </div>

                    <h6 className="mt-2 text-sm font-extrabold text-foreground">
                      {exam.titulo}
                    </h6>
                    <p className="mt-0.5 text-[11px] font-semibold text-brand">
                      {moduleNameMap.get(exam.module_id) || 'Módulo'}
                    </p>

                    <dl className="mt-2.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-slate-500">Apertura:</dt>
                        <dd>{formatDateTime(exam.fecha_apertura)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-slate-500">Cierre:</dt>
                        <dd>{formatDateTime(exam.fecha_cierre)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-700/70">
                    {existing ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                          }`}
                        >
                          {isApproved ? '✓ Aprobado' : 'Realizado'}:{' '}
                          {existing.calificacion_automatica} / {exam.punteo_maximo} pts
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const nextId = isSelected ? '' : exam.id;
                            setActiveExamId(nextId);
                            onSelectExam?.(nextId);
                            setAnswers({});
                          }}
                        >
                          {isSelected ? 'Cerrar' : 'Repetir evaluación'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {isPresencial
                            ? 'Requiere validación NFC'
                            : 'Disponible en línea'}
                        </span>
                        <Button
                          variant="brand"
                          size="sm"
                          disabled={
                            isWaitingNfc && activeExam?.id === exam.id
                          }
                          onClick={() => {
                            setAnswers({});
                            if (isPresencial && !nfcVerifiedForExam[exam.id]) {
                              void handleVerifyNfc(exam);
                            } else {
                              const nextId = isSelected ? '' : exam.id;
                              setActiveExamId(nextId);
                              onSelectExam?.(nextId);
                              setIsWaitingNfc(false);
                              setIsPollingReady(false);
                              setNfcVerifiedBanner('');
                            }
                          }}
                        >
                          {isPresencial && !nfcVerifiedForExam[exam.id]
                            ? isWaitingNfc && activeExam?.id === exam.id
                              ? 'Acercando al lector de laboratorio...'
                              : 'Validar Asistencia NFC'
                            : isSelected
                            ? 'Cerrar examen'
                            : 'Realizar examen'}
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Panel interactivo para resolver el examen seleccionado */}
        {activeExam && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 dark:border-blue-500/20 dark:from-blue-950/40 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  Evaluación activa · {activeExam.tipo.toUpperCase()} ({activeExam.modalidad})
                </p>
                <h6 className="text-lg font-black text-foreground">
                  {activeExam.titulo}
                </h6>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsWaitingNfc(false);
                  setIsPollingReady(false);
                  setActiveExamId('');
                  onSelectExam?.('');
                }}
              >
                Cancelar
              </Button>
            </div>

            {activeExam.modalidad === 'presencial' && (
              <div
                className={`mt-4 space-y-3 rounded-2xl border p-4 transition-colors ${
                  nfcVerifiedForExam[activeExam.id]
                    ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-surface dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">
                    Verificación de presencia NFC requerida
                  </p>
                  {nfcVerifiedForExam[activeExam.id] ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ✓ ¡Asistencia NFC verificada con éxito!
                    </span>
                  ) : isWaitingNfc ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      <span className="h-2 w-2 animate-ping rounded-full bg-amber-600" />
                      Acercando al lector de laboratorio...
                    </span>
                  ) : null}
                </div>

                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Haz clic en <strong>Validar Asistencia NFC</strong> y acerca tu carné universitario al lector físico del laboratorio para desbloquear tu evaluación presencial en tiempo real.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={
                      nfcVerifiedForExam[activeExam.id] ? 'secondary' : 'brand'
                    }
                    size="sm"
                    disabled={
                      isWaitingNfc || Boolean(nfcVerifiedForExam[activeExam.id])
                    }
                    onClick={() => handleVerifyNfc(activeExam)}
                  >
                    {nfcVerifiedForExam[activeExam.id]
                      ? 'Validar Asistencia NFC'
                      : isWaitingNfc
                      ? 'Acercando al lector de laboratorio...'
                      : 'Validar Asistencia NFC'}
                  </Button>
                </div>

                {isWaitingNfc && !nfcVerifiedForExam[activeExam.id] && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <span>
                      Acercando al lector de laboratorio... (Escuchando lectura de la ESP32 cada 2s / Supabase Realtime)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsWaitingNfc(false);
                        setIsPollingReady(false);
                      }}
                      className="font-bold underline hover:opacity-80 cursor-pointer"
                    >
                      Cancelar espera
                    </button>
                  </div>
                )}

                {nfcVerifiedForExam[activeExam.id] && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/70 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                    {nfcVerifiedBanner || '¡Asistencia NFC verificada con éxito!'}
                  </div>
                )}
              </div>
            )}

            {(activeExam.modalidad !== 'presencial' ||
              Boolean(nfcVerifiedForExam[activeExam.id])) && (
              <form onSubmit={handleSubmitExam} className="mt-4 space-y-3">
                {SAMPLE_QUESTIONS.map((q, index) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-surface p-4 dark:border-slate-800"
                  >
                    <p className="text-xs font-bold text-foreground">
                      {index + 1}. {q.prompt}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {q.options.map((opt, optIndex) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-foreground transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <input
                            type="radio"
                            name={`aula-${q.id}`}
                            checked={answers[q.id] === optIndex}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: optIndex,
                              }))
                            }
                            required
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  isLoading={isSubmittingExam}
                >
                  Finalizar y Enviar Evaluación
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
