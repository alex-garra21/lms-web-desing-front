'use client';

import React, { useState, useMemo } from 'react';
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

  // Estado para examen y verificación NFC
  const [activeExam, setActiveExam] = useState<ExamRecord | null>(null);
  const [nfcTokenInput, setNfcTokenInput] = useState('');
  const [nfcVerifiedForExam, setNfcVerifiedForExam] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});

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
    const cleanInput = nfcTokenInput.trim();
    const expectedHash = currentUser.nfc_token_hash;

    if (!cleanInput) {
      onFeedback({
        type: 'error',
        message: 'Ingresa o escanea tu código/token NFC de carné universitario.',
      });
      return;
    }

    if (expectedHash && cleanInput !== expectedHash) {
      onFeedback({
        type: 'error',
        message:
          'El token NFC no coincide con la credencial vinculada a tu perfil institucional.',
      });
      return;
    }

    setNfcVerifiedForExam((prev) => ({ ...prev, [exam.id]: true }));
    onFeedback({
      type: 'success',
      message: 'Asistencia presencial NFC validada. Ya puedes resolver tu examen.',
    });
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
                        onClick={() => {
                          setActiveExam(exam);
                          setAnswers({});
                        }}
                      >
                        Resolver examen
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
                onClick={() => setActiveExam(null)}
              >
                Cancelar
              </Button>
            </div>

            {activeExam.modalidad === 'presencial' &&
            !nfcVerifiedForExam[activeExam.id] ? (
              <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-surface p-5 dark:border-slate-800">
                <h4 className="text-sm font-bold text-foreground">
                  Verificación de Asistencia NFC Requerida
                </h4>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Acerca tu carné universitario NFC al lector del laboratorio o ingresa el token NFC asignado a tu perfil ({currentUser.nfc_token_hash ? 'Credencial vinculada' : 'Validación de aula'}).
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Input
                    label="Token / UID Credencial NFC"
                    value={nfcTokenInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNfcTokenInput(e.target.value)
                    }
                    placeholder={
                      currentUser.nfc_token_hash || 'NFC-UMG-COBAN-...'
                    }
                  />
                  <Button
                    variant="brand"
                    onClick={() => handleVerifyNfc(activeExam)}
                  >
                    Validar Asistencia NFC
                  </Button>
                </div>
              </div>
            ) : (
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
