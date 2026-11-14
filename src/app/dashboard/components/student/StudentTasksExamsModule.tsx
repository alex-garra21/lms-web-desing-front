'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { formatDateTime, buildSubmissionStoragePath } from '../../utils';
import { SAMPLE_QUESTIONS } from '../../constants';
import type {
  UserProfile,
  ModuleRecord,
  AssignmentRecord,
  ExamRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  CourseRecord,
  StatusFeedback,
} from '../../types';

// =====================================================================
// Módulo 7 (student): Tareas, Entregas y Exámenes con NFC
// =====================================================================

export interface StudentTasksExamsModuleProps {
  currentUser: UserProfile;
  modules: ModuleRecord[];
  assignments: AssignmentRecord[];
  exams: ExamRecord[];
  assignmentSubmissions: AssignmentSubmissionRecord[];
  examSubmissions: ExamSubmissionRecord[];
  coursesMap: Map<string, CourseRecord>;
  focusedAssignmentId: string | null;
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function StudentTasksExamsModule({
  currentUser,
  modules,
  assignments,
  exams,
  assignmentSubmissions,
  examSubmissions,
  coursesMap,
  focusedAssignmentId,
  onReloadStudentData,
  onFeedback,
}: StudentTasksExamsModuleProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null
  );
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para examen y verificación NFC en tiempo real
  const [activeExam, setActiveExam] = useState<ExamRecord | null>(null);
  const [nfcVerifiedForExam, setNfcVerifiedForExam] = useState<Record<string, boolean>>({});
  const [isWaitingNfc, setIsWaitingNfc] = useState(false);
  const [isPollingReady, setIsPollingReady] = useState(false);
  const [nfcVerifiedBanner, setNfcVerifiedBanner] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});

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

    // 1. Canal Supabase Realtime sobre la tabla exam_attendances para este estudiante y examen
    const channel = supabase
      .channel(`nfc-attendance-${currentUser.id}-${examId}`)
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

    // 2. Intervalo de sondeo cada 2 segundos hacia GET /api/nfc/validar?student_id=...&exam_id=...
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
        // Ignorar errores de red transitorios durante el sondeo
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

  const activeAssignmentId =
    selectedAssignmentId !== null
      ? selectedAssignmentId
      : focusedAssignmentId || '';

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleRecord>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

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

  const handleUploadAndSubmitTask = async (
    e: React.FormEvent<HTMLFormElement>,
    assignment: AssignmentRecord
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalFileUrl = submissionUrl.trim();

      if (selectedFile) {
        const storagePath = buildSubmissionStoragePath(
          currentUser.id,
          assignment.id,
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

      if (!finalFileUrl) {
        onFeedback({
          type: 'error',
          message: 'Adjunta un archivo o proporciona el enlace de tu entrega.',
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('assignment_submissions').upsert(
        [
          {
            assignment_id: assignment.id,
            student_id: currentUser.id,
            archivo_url: finalFileUrl,
            comentario: submissionComment.trim() || null,
          },
        ],
        { onConflict: 'assignment_id,student_id' }
      );

      if (error) throw new Error(error.message);

      setSelectedFile(null);
      setSubmissionUrl('');
      setSubmissionComment('');
      setSelectedAssignmentId('');
      onFeedback({
        type: 'success',
        message: `Entrega registrada para "${assignment.titulo}".`,
      });
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Error al enviar la tarea.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyNfc = async (exam: ExamRecord) => {
    setActiveExam(exam);
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
        message: 'Debes validar tu asistencia NFC antes de enviar un examen presencial.',
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

    setIsSubmitting(true);
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
        message: `Examen enviado. Calificación automática: ${computedScore} / ${maxScore}.`,
      });
      setActiveExam(null);
      setAnswers({});
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo enviar el examen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tareas Pendientes y Entregas */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Entregas académicas (`assignments`)
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Mis tareas ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            No tienes tareas asignadas en tus cursos inscritos por el momento.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {assignments.map((task) => {
              const mod = moduleMap.get(task.module_id);
              const course = mod ? coursesMap.get(mod.course_id) : undefined;
              const existing = submissionByAssignment.get(task.id);
              const isOpen = activeAssignmentId === task.id;

              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-brand">
                      {course?.titulo || 'Curso'} · {mod?.titulo || 'Módulo'}
                    </span>
                    {existing?.calificacion !== null &&
                    existing?.calificacion !== undefined ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Nota: {existing.calificacion} / {task.punteo_maximo}
                      </span>
                    ) : existing ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        Entregada
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-bold text-foreground">
                    <Link
                      href={maskRoute(
                        `/dashboard?tab=tasks-exams&assignment=${encodeId(task.id)}`
                      )}
                      onClick={() => setSelectedAssignmentId(task.id)}
                      className="hover:text-brand hover:underline"
                    >
                      {task.titulo}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {task.descripcion}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Fecha límite: {formatDateTime(task.fecha_limite)} · Valor: {task.punteo_maximo} pts
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={isOpen ? 'ghost' : 'brand'}
                      size="sm"
                      onClick={() =>
                        setSelectedAssignmentId(isOpen ? '' : task.id)
                      }
                    >
                      {isOpen
                        ? 'Cerrar formulario'
                        : existing
                        ? 'Actualizar entrega'
                        : 'Subir entrega'}
                    </Button>
                  </div>

                  {isOpen && (
                    <form
                      onSubmit={(e) => handleUploadAndSubmitTask(e, task)}
                      className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Archivo de entrega (PDF, ZIP, DOCX)
                        </label>
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-xs text-foreground dark:border-slate-700"
                        />
                      </div>

                      <Input
                        label="O enlace directo al archivo / repositorio"
                        type="url"
                        value={submissionUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubmissionUrl(e.target.value)
                        }
                        placeholder="https://drive.google.com/... o GitHub"
                      />

                      <Input
                        label="Comentario para el docente"
                        value={submissionComment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubmissionComment(e.target.value)
                        }
                        placeholder="Notas sobre la entrega"
                      />

                      <Button
                        type="submit"
                        variant="brand"
                        size="sm"
                        isLoading={isSubmitting}
                      >
                        Enviar Tarea
                      </Button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Exámenes y Validación NFC */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Evaluaciones (`exams` y `exam_submissions`)
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Exámenes disponibles ({exams.length})
        </h2>

        {exams.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            No hay exámenes programados en tus cursos inscritos.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {exams.map((exam) => {
              const mod = moduleMap.get(exam.module_id);
              const existing = submissionByExam.get(exam.id);
              const isPresencial = exam.modalidad === 'presencial';

              return (
                <article
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {exam.tipo} · {exam.modalidad}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {exam.punteo_maximo} pts
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-foreground">
                    {exam.titulo}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {mod?.titulo || 'Módulo'} · Cierre: {formatDateTime(exam.fecha_cierre)}
                  </p>

                  {existing ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Nota obtenida: {existing.calificacion_automatica} / {exam.punteo_maximo} ·{' '}
                      Asistencia NFC:{' '}
                      {existing.asistencia_verificada ? 'Verificada' : 'Virtual'}
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {isPresencial
                          ? 'Requiere verificación NFC en laboratorio'
                          : 'Modalidad virtual habilitada'}
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
                            setActiveExam(exam);
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
                          : 'Resolver examen'}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {activeExam && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-6 dark:border-blue-500/20 dark:from-blue-950/40 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  Evaluación en curso · {activeExam.modalidad}
                </p>
                <h3 className="text-xl font-black text-foreground">
                  {activeExam.titulo}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsWaitingNfc(false);
                  setIsPollingReady(false);
                  setActiveExam(null);
                }}
              >
                Cancelar
              </Button>
            </div>

            {activeExam.modalidad === 'presencial' && (
              <div
                className={`mt-5 space-y-4 rounded-2xl border p-5 transition-colors ${
                  nfcVerifiedForExam[activeExam.id]
                    ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-surface dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Verificación de Asistencia NFC Presencial
                  </h4>
                  {nfcVerifiedForExam[activeExam.id] ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ✓ ¡Asistencia NFC verificada con éxito!
                    </span>
                  ) : isWaitingNfc ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      <span className="h-2 w-2 animate-ping rounded-full bg-amber-600" />
                      Acercando al lector de laboratorio...
                    </span>
                  ) : null}
                </div>

                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Haz clic en <strong>Validar Asistencia NFC</strong> y acerca tu carné universitario al lector físico del laboratorio para desbloquear tu evaluación presencial en tiempo real.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant={
                      nfcVerifiedForExam[activeExam.id] ? 'secondary' : 'brand'
                    }
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
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/70 px-4 py-3 text-xs font-semibold text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                    {nfcVerifiedBanner || '¡Asistencia NFC verificada con éxito!'}
                  </div>
                )}
              </div>
            )}

            {(activeExam.modalidad !== 'presencial' ||
              Boolean(nfcVerifiedForExam[activeExam.id])) && (
              <form onSubmit={handleSubmitExam} className="mt-5 space-y-4">
                {SAMPLE_QUESTIONS.map((q, index) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-slate-800"
                  >
                    <p className="text-sm font-bold text-foreground">
                      {index + 1}. {q.prompt}
                    </p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <input
                            type="radio"
                            name={q.id}
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
                <Button type="submit" variant="brand" isLoading={isSubmitting}>
                  Finalizar y Enviar Evaluación
                </Button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
