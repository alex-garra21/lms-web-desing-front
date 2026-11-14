'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, Select } from '@/components';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { formatDateTime } from '../../utils';
import type {
  UserProfile,
  CourseRecord,
  ModuleRecord,
  AssignmentRecord,
  ExamRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  StatusFeedback,
  ExamModality,
  ExamType,
} from '../../types';

// =====================================================================
// Módulo 5 (instructor): Evaluaciones, Tareas y Calificación de Entregas
// =====================================================================

export interface InstructorEvaluationsModuleProps {
  courses: CourseRecord[];
  modules: ModuleRecord[];
  assignments: AssignmentRecord[];
  exams: ExamRecord[];
  assignmentSubmissions: AssignmentSubmissionRecord[];
  examSubmissions: ExamSubmissionRecord[];
  studentsMap: Map<string, UserProfile>;
  focusedAssignmentId: string | null;
  onReloadAcademic: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function InstructorEvaluationsModule({
  courses,
  modules,
  assignments,
  exams,
  assignmentSubmissions,
  examSubmissions,
  studentsMap,
  focusedAssignmentId,
  onReloadAcademic,
  onFeedback,
}: InstructorEvaluationsModuleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>('');

  const [assignmentForm, setAssignmentForm] = useState({
    module_id: '',
    titulo: '',
    descripcion: '',
    fecha_limite: '',
    punteo_maximo: '100',
  });

  const [examForm, setExamForm] = useState({
    module_id: '',
    titulo: '',
    tipo: 'parcial' as ExamType,
    modalidad: 'presencial' as ExamModality,
    fecha_apertura: '',
    fecha_cierre: '',
    punteo_maximo: '100',
  });

  const effectiveAssignmentFilter =
    selectedAssignmentFilter || focusedAssignmentId || 'all';
  const effectiveAssignmentModuleId =
    assignmentForm.module_id || modules[0]?.id || '';
  const effectiveExamModuleId =
    examForm.module_id || modules[0]?.id || '';

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleRecord>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseRecord>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignmentRecord>();
    assignments.forEach((a) => map.set(a.id, a));
    return map;
  }, [assignments]);

  const examMap = useMemo(() => {
    const map = new Map<string, ExamRecord>();
    exams.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [exams]);

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveAssignmentModuleId || !assignmentForm.fecha_limite) {
      onFeedback({
        type: 'error',
        message: 'Selecciona módulo y fecha límite para la tarea.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: effectiveAssignmentModuleId,
        titulo: assignmentForm.titulo.trim(),
        descripcion: assignmentForm.descripcion.trim(),
        fecha_limite: new Date(assignmentForm.fecha_limite).toISOString(),
        punteo_maximo: Number(assignmentForm.punteo_maximo) || 100,
      };

      const { error } = await supabase.from('assignments').insert([payload]);
      if (error) throw new Error(error.message);

      setAssignmentForm((prev) => ({
        ...prev,
        titulo: '',
        descripcion: '',
        fecha_limite: '',
        punteo_maximo: '100',
      }));
      onFeedback({
        type: 'success',
        message: `Tarea "${payload.titulo}" creada correctamente.`,
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear la tarea.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !effectiveExamModuleId ||
      !examForm.fecha_apertura ||
      !examForm.fecha_cierre
    ) {
      onFeedback({
        type: 'error',
        message: 'Selecciona módulo, apertura y cierre para la evaluación.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: effectiveExamModuleId,
        titulo: examForm.titulo.trim(),
        tipo: examForm.tipo,
        modalidad: examForm.modalidad,
        fecha_apertura: new Date(examForm.fecha_apertura).toISOString(),
        fecha_cierre: new Date(examForm.fecha_cierre).toISOString(),
        punteo_maximo: Number(examForm.punteo_maximo) || 100,
      };

      const { error } = await supabase.from('exams').insert([payload]);
      if (error) throw new Error(error.message);

      setExamForm((prev) => ({
        ...prev,
        titulo: '',
        fecha_apertura: '',
        fecha_cierre: '',
        punteo_maximo: '100',
      }));
      onFeedback({
        type: 'success',
        message: `Evaluación "${payload.titulo}" creada correctamente.`,
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el examen.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeAssignment = async (submission: AssignmentSubmissionRecord) => {
    const parentAssignment = assignmentMap.get(submission.assignment_id);
    const maxPoints = Number(parentAssignment?.punteo_maximo ?? 100);
    const rawScore =
      gradeInputs[submission.id] ?? String(submission.calificacion ?? '');
    const numericScore = Number(rawScore);

    if (
      rawScore.trim() === '' ||
      Number.isNaN(numericScore) ||
      numericScore < 0 ||
      numericScore > maxPoints
    ) {
      onFeedback({
        type: 'error',
        message: `Ingresa una calificación válida entre 0 y ${maxPoints}.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          calificacion: numericScore,
          calificado_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: 'Calificación registrada correctamente.',
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la calificación.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleExamAttendance = async (submission: ExamSubmissionRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('exam_submissions')
        .update({ asistencia_verificada: !submission.asistencia_verificada })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: 'Estado de asistencia NFC actualizado.',
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la asistencia NFC.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (effectiveAssignmentFilter === 'all') return assignmentSubmissions;
    return assignmentSubmissions.filter(
      (item) => item.assignment_id === effectiveAssignmentFilter
    );
  }, [assignmentSubmissions, effectiveAssignmentFilter]);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Creación de Tareas */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Nueva tarea (`assignments`)
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">
            Publicar tarea o proyecto
          </h2>

          <form onSubmit={handleCreateAssignment} className="mt-4 space-y-3">
            <Select
              label="Módulo"
              value={effectiveAssignmentModuleId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  module_id: e.target.value,
                }))
              }
              placeholder="Selecciona módulo"
              options={modules.map((m) => ({
                value: m.id,
                label: `${courseMap.get(m.course_id)?.titulo || 'Curso'} · ${m.titulo}`,
              }))}
              required
            />
            <Input
              label="Título de la tarea"
              value={assignmentForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAssignmentForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Práctica 2: Normalización de BD"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Instrucciones <span className="ml-1 font-bold text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={assignmentForm.descripcion}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Describe el entregable esperado, formato y rúbrica."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Fecha límite"
                type="datetime-local"
                value={assignmentForm.fecha_limite}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    fecha_limite: e.target.value,
                  }))
                }
                required
              />
              <Input
                label="Punteo máximo"
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={assignmentForm.punteo_maximo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    punteo_maximo: e.target.value,
                  }))
                }
                required
              />
            </div>
            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Publicar Tarea
            </Button>
          </form>
        </section>

        {/* Creación de Exámenes */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Nueva evaluación (`exams`)
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">
            Programar examen parcial o final
          </h2>

          <form onSubmit={handleCreateExam} className="mt-4 space-y-3">
            <Select
              label="Módulo"
              value={effectiveExamModuleId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setExamForm((prev) => ({ ...prev, module_id: e.target.value }))
              }
              placeholder="Selecciona módulo"
              options={modules.map((m) => ({
                value: m.id,
                label: `${courseMap.get(m.course_id)?.titulo || 'Curso'} · ${m.titulo}`,
              }))}
              required
            />
            <Input
              label="Título del examen"
              value={examForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setExamForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Primer Parcial Presencial"
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Tipo"
                value={examForm.tipo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    tipo: e.target.value as ExamType,
                  }))
                }
                options={[
                  { value: 'parcial', label: 'Parcial' },
                  { value: 'final', label: 'Final' },
                ]}
              />
              <Select
                label="Modalidad"
                value={examForm.modalidad}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    modalidad: e.target.value as ExamModality,
                  }))
                }
                options={[
                  { value: 'presencial', label: 'Presencial (NFC)' },
                  { value: 'virtual', label: 'Virtual' },
                ]}
              />
              <Input
                label="Punteo máx."
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={examForm.punteo_maximo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    punteo_maximo: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Fecha apertura"
                type="datetime-local"
                value={examForm.fecha_apertura}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    fecha_apertura: e.target.value,
                  }))
                }
                required
              />
              <Input
                label="Fecha cierre"
                type="datetime-local"
                value={examForm.fecha_cierre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    fecha_cierre: e.target.value,
                  }))
                }
                required
              />
            </div>
            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Programar Evaluación
            </Button>
          </form>
        </section>
      </div>

      {/* Catálogo de Tareas y Exámenes publicados */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-black text-foreground">
              Tareas activas ({assignments.length})
            </h3>
            <div className="mt-4 space-y-3">
              {assignments.map((task) => {
                const mod = moduleMap.get(task.module_id);
                return (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-brand">
                        {mod?.titulo || 'Módulo'}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {task.punteo_maximo} pts
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-foreground">
                      <Link
                        href={maskRoute(
                          `/dashboard?tab=evaluations&assignment=${encodeId(task.id)}`
                        )}
                        onClick={() => setSelectedAssignmentFilter(task.id)}
                        className="hover:text-brand hover:underline"
                      >
                        {task.titulo}
                      </Link>
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Límite: {formatDateTime(task.fecha_limite)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-foreground">
              Exámenes programados ({exams.length})
            </h3>
            <div className="mt-4 space-y-3">
              {exams.map((exam) => {
                const mod = moduleMap.get(exam.module_id);
                return (
                  <article
                    key={exam.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-brand">
                        {exam.tipo} · {exam.modalidad}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {exam.punteo_maximo} pts
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-foreground">
                      {exam.titulo}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {mod?.titulo || 'Módulo'} · Cierre: {formatDateTime(exam.fecha_cierre)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Revisión y Calificación de Entregas */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Revisión académica
            </p>
            <h3 className="mt-1 text-2xl font-black text-foreground">
              Entregas de estudiantes ({filteredSubmissions.length})
            </h3>
          </div>

          <div className="w-full sm:w-72">
            <Select
              label="Filtrar por tarea"
              value={effectiveAssignmentFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedAssignmentFilter(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todas las tareas' },
                ...assignments.map((a) => ({ value: a.id, label: a.titulo })),
              ]}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Entrega y comentario</th>
                <th className="px-4 py-3">Calificación</th>
                <th className="px-4 py-3 text-right">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aún no se han recibido entregas de tareas para revisar.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => {
                  const student = studentsMap.get(submission.student_id);
                  const task = assignmentMap.get(submission.assignment_id);
                  const inputValue =
                    gradeInputs[submission.id] ??
                    (submission.calificacion !== null &&
                    submission.calificacion !== undefined
                      ? String(submission.calificacion)
                      : '');

                  return (
                    <tr key={submission.id}>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {student
                            ? `${student.nombres} ${student.apellidos}`
                            : encodeId(submission.student_id)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {student?.correo || 'Estudiante inscrito'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                        {task?.titulo || 'Tarea'}
                        <div className="text-[11px] font-normal text-slate-500">
                          Máx: {task?.punteo_maximo ?? 100} pts
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {submission.archivo_url ? (
                          <a
                            href={submission.archivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-brand hover:underline"
                          >
                            Abrir archivo entregado
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin archivo adjunto</span>
                        )}
                        {submission.comentario && (
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {submission.comentario}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={task?.punteo_maximo ?? 100}
                          value={inputValue}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [submission.id]: e.target.value,
                            }))
                          }
                          placeholder="0 - 100"
                          className="w-24 rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-brand dark:border-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="brand"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleGradeAssignment(submission)}
                        >
                          Calificar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resultados de Exámenes */}
        <h3 className="mt-8 text-lg font-black text-foreground">
          Intentos de exámenes y validación NFC ({examSubmissions.length})
        </h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Examen</th>
                <th className="px-4 py-3">Nota automática</th>
                <th className="px-4 py-3">Asistencia NFC</th>
                <th className="px-4 py-3 text-right">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {examSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Sin intentos de exámenes registrados todavía.
                  </td>
                </tr>
              ) : (
                examSubmissions.map((attempt) => {
                  const student = studentsMap.get(attempt.student_id);
                  const exam = examMap.get(attempt.exam_id);
                  return (
                    <tr key={attempt.id}>
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        {student
                          ? `${student.nombres} ${student.apellidos}`
                          : encodeId(attempt.student_id)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {exam?.titulo || 'Evaluación'} ({exam?.modalidad || 'virtual'})
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {attempt.calificacion_automatica} / {exam?.punteo_maximo ?? 100}
                      </td>
                      <td className="px-4 py-3.5">
                        {attempt.asistencia_verificada ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Verificada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleToggleExamAttendance(attempt)}
                        >
                          {attempt.asistencia_verificada
                            ? 'Revocar NFC'
                            : 'Validar NFC'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
