'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, CustomSelect } from '@/components';
import { maskRoute } from '@/utils/routeHasher';
import { formatDateTime } from '../../utils';
import type {
  UserProfile,
  EnrollmentRecord,
  CourseReviewRecord,
  StatusFeedback,
} from '../../types';

// =====================================================================
// Módulo 8 (student): Reseñas de Cursos Finalizados
// =====================================================================

export interface StudentReviewsModuleProps {
  currentUser: UserProfile;
  enrollments: EnrollmentRecord[];
  reviews: CourseReviewRecord[];
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function StudentReviewsModule({
  currentUser,
  enrollments,
  reviews,
  onReloadStudentData,
  onFeedback,
}: StudentReviewsModuleProps) {
  const finishedEnrollments = useMemo(
    () =>
      enrollments.filter(
        (e) =>
          e.progreso_porcentaje >= 100 || Number(e.calificacion_final ?? 0) > 0
      ),
    [enrollments]
  );

  const [courseId, setCourseId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [comentario, setComentario] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const effectiveCourseId = courseId || finishedEnrollments[0]?.course_id || '';

  const courseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    enrollments.forEach((e) => {
      if (e.courses?.titulo) map.set(e.course_id, e.courses.titulo);
    });
    return map;
  }, [enrollments]);

  const handleSaveReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCourseId) {
      onFeedback({
        type: 'error',
        message: 'Completa un curso al 100% para habilitar la reseña.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('course_reviews').upsert(
        [
          {
            course_id: effectiveCourseId,
            student_id: currentUser.id,
            rating,
            comentario: comentario.trim() || null,
            is_deleted: false,
          },
        ],
        { onConflict: 'course_id,student_id' }
      );

      if (error) throw new Error(error.message);

      setComentario('');
      onFeedback({
        type: 'success',
        message: 'Tu reseña académica fue guardada correctamente.',
      });
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo guardar la reseña.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Calificación de cursos (`course_reviews`)
        </p>
        <h2 className="mt-1 text-xl font-black text-foreground">
          Publicar reseña de curso finalizado
        </h2>

        {finishedEnrollments.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Completa al 100% las lecciones de alguno de tus cursos inscritos en la pestaña &quot;Mis Cursos&quot; para desbloquear la calificación por estrellas.
          </p>
        ) : (
          <form onSubmit={handleSaveReview} className="mt-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Curso finalizado <span className="ml-1 font-bold text-rose-500">*</span>
              </label>
              <CustomSelect
                label=""
                value={effectiveCourseId}
                onChange={(newValue: string) => setCourseId(newValue)}
                options={finishedEnrollments.map((e) => ({
                  value: e.course_id,
                  label: e.courses?.titulo || 'Curso finalizado',
                }))}
                fullWidth
                buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
              />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Calificación (1 a 5 estrellas)
              </span>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star} estrellas`}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-all ${
                      star <= rating
                        ? 'border-amber-400 bg-amber-50 text-amber-500 dark:border-amber-500/50 dark:bg-amber-500/10'
                        : 'border-slate-200 bg-surface text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-foreground">
                  {rating}.0 / 5
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Comentario sobre el curso
              </label>
              <textarea
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comparte tu experiencia con las lecciones, evaluaciones y acompañamiento docente."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>

            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Guardar Reseña
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Historial de opiniones
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Mis reseñas enviadas ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Aún no has enviado reseñas para tus cursos finalizados.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {reviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={maskRoute(`/courses/${rev.course_id}`)}
                    className="text-sm font-bold text-foreground hover:text-brand hover:underline"
                  >
                    {courseNameMap.get(rev.course_id) || 'Curso UMG'}
                  </Link>
                  <span className="text-sm font-bold text-amber-500">
                    {'★'.repeat(rev.rating)}
                    <span className="text-slate-300 dark:text-slate-600">
                      {'★'.repeat(5 - rev.rating)}
                    </span>
                  </span>
                </div>
                {rev.comentario && (
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {rev.comentario}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{formatDateTime(rev.created_at)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCourseId(rev.course_id);
                      setRating(rev.rating);
                      setComentario(rev.comentario || '');
                    }}
                  >
                    Editar reseña
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
