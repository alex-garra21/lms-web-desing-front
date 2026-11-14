'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, Select } from '@/components';
import VideoPlayer from '@/components/VideoPlayer';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { generateInstitutionalCode } from '../../utils';
import type {
  UserProfile,
  CourseRecord,
  ModuleRecord,
  ContentRecord,
  StatusFeedback,
} from '../../types';

// =====================================================================
// Módulo 4 (instructor): Cursos Asignados, Módulos y Contenidos
// =====================================================================

export interface InstructorCoursesModuleProps {
  currentUser: UserProfile;
  courses: CourseRecord[];
  modules: ModuleRecord[];
  contents: ContentRecord[];
  selectedCourseId: string;
  selectedModuleId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onReloadAcademic: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function InstructorCoursesModule({
  currentUser,
  courses,
  modules,
  contents,
  selectedCourseId,
  selectedModuleId,
  onSelectCourse,
  onSelectModule,
  onReloadAcademic,
  onFeedback,
}: InstructorCoursesModuleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState<ContentRecord | null>(null);

  // Formulario de curso
  const [courseForm, setCourseForm] = useState({
    titulo: '',
    descripcion: '',
    codigo_asignacion: '',
    thumbnail: '',
  });

  // Formulario de módulo
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({
    titulo: '',
    descripcion: '',
    orden: '1',
  });

  // Formulario de contenido
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState({
    module_id: selectedModuleId || '',
    titulo: '',
    cuerpo: '',
    youtube_url: '',
    orden: '1',
  });

  const courseModules = useMemo(
    () =>
      modules
        .filter((m) => m.course_id === selectedCourseId)
        .sort((a, b) => a.orden - b.orden),
    [modules, selectedCourseId]
  );

  const effectiveContentModuleId =
    contentForm.module_id || selectedModuleId || courseModules[0]?.id || '';

  const visibleContents = useMemo(() => {
    const moduleIds = new Set(courseModules.map((m) => m.id));
    return contents
      .filter(
        (c) =>
          moduleIds.has(c.module_id) &&
          (!selectedModuleId || c.module_id === selectedModuleId)
      )
      .sort((a, b) => a.orden - b.orden);
  }, [contents, courseModules, selectedModuleId]);

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!courseForm.titulo.trim() || !courseForm.descripcion.trim()) {
      onFeedback({
        type: 'error',
        message: 'Ingresa el título y descripción del curso.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        titulo: courseForm.titulo.trim(),
        descripcion: courseForm.descripcion.trim(),
        instructor_id: currentUser.id,
        codigo_asignacion:
          courseForm.codigo_asignacion.trim().toUpperCase() ||
          generateInstitutionalCode('UMG'),
        thumbnail: courseForm.thumbnail.trim() || null,
        is_active: true,
      };

      const { data: created, error } = await supabase
        .from('courses')
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      setCourseForm({
        titulo: '',
        descripcion: '',
        codigo_asignacion: '',
        thumbnail: '',
      });
      onFeedback({
        type: 'success',
        message: `Curso "${payload.titulo}" publicado y asignado a tu cátedra.`,
      });
      await onReloadAcademic();
      if (created?.id) onSelectCourse(created.id);
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el curso.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourseId) {
      onFeedback({
        type: 'error',
        message: 'Selecciona primero uno de tus cursos asignados.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        course_id: selectedCourseId,
        titulo: moduleForm.titulo.trim(),
        descripcion: moduleForm.descripcion.trim() || null,
        orden: Number(moduleForm.orden) || 1,
      };

      if (editingModuleId) {
        const { error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', editingModuleId);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Módulo actualizado correctamente.' });
      } else {
        const { error } = await supabase.from('modules').insert([payload]);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Módulo creado en el curso.' });
      }

      setEditingModuleId(null);
      setModuleForm({ titulo: '', descripcion: '', orden: String(courseModules.length + 2) });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el módulo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteModule = async (mod: ModuleRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_deleted: true })
        .eq('id', mod.id);
      if (error) throw new Error(error.message);

      onFeedback({ type: 'success', message: `Módulo "${mod.titulo}" archivado.` });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo archivar el módulo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const targetModuleId = effectiveContentModuleId;
    if (!targetModuleId) {
      onFeedback({
        type: 'error',
        message: 'Selecciona un módulo destino para agregar el contenido.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: targetModuleId,
        titulo: contentForm.titulo.trim(),
        cuerpo: contentForm.cuerpo.trim() || null,
        youtube_url: contentForm.youtube_url.trim() || null,
        orden: Number(contentForm.orden) || 1,
      };

      if (editingContentId) {
        const { error } = await supabase
          .from('contents')
          .update(payload)
          .eq('id', editingContentId);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Contenido actualizado correctamente.' });
      } else {
        const { error } = await supabase.from('contents').insert([payload]);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Lección / recurso agregado al módulo.' });
      }

      setEditingContentId(null);
      setContentForm({
        module_id: targetModuleId,
        titulo: '',
        cuerpo: '',
        youtube_url: '',
        orden: String(visibleContents.length + 2),
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el contenido.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteContent = async (content: ContentRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contents')
        .update({ is_deleted: true })
        .eq('id', content.id);
      if (error) throw new Error(error.message);

      onFeedback({ type: 'success', message: `Contenido "${content.titulo}" eliminado.` });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo eliminar el contenido.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Mis cursos impartidos
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Cursos asignados ({courses.length})
            </h2>
          </div>

          {courses.length > 0 && (
            <div className="w-full md:w-80">
              <Select
                label="Curso activo en edición"
                value={selectedCourseId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  onSelectCourse(e.target.value);
                  onSelectModule('');
                }}
                options={courses.map((course) => ({
                  value: course.id,
                  label: course.titulo,
                }))}
              />
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Aún no tienes cursos asignados en `courses`. Crea uno nuevo en el formulario inferior.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const isSelected = course.id === selectedCourseId;
              return (
                <article
                  key={course.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-brand bg-blue-50/50 shadow-sm dark:border-brand dark:bg-blue-500/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {course.codigo_asignacion || 'SIN-COD'}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          course.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                        }`}
                      >
                        {course.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-foreground">
                      {course.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {course.descripcion}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={isSelected ? 'brand' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        onSelectCourse(course.id);
                        onSelectModule('');
                      }}
                    >
                      {isSelected ? 'Editando' : 'Gestionar'}
                    </Button>
                    <Button
                      href={maskRoute(`/courses/${course.id}`)}
                      variant="ghost"
                      size="sm"
                    >
                      Vista pública
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gestión de Módulos */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Estructura curricular (`modules`)
          </p>
          <h3 className="mt-1 text-xl font-black text-foreground">
            Módulos del curso ({courseModules.length})
          </h3>

          <form onSubmit={handleSaveModule} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <Input
                label="Título del módulo"
                value={moduleForm.titulo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModuleForm((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ej. Módulo 1: Arquitectura"
                required
              />
              <Input
                label="Orden"
                type="number"
                min={1}
                value={moduleForm.orden}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModuleForm((prev) => ({ ...prev, orden: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="Descripción"
              value={moduleForm.descripcion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setModuleForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Objetivos bimestrales del módulo"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="brand" size="sm" isLoading={isSaving}>
                {editingModuleId ? 'Actualizar Módulo' : 'Agregar Módulo'}
              </Button>
              {editingModuleId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingModuleId(null);
                    setModuleForm({ titulo: '', descripcion: '', orden: '1' });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {courseModules.map((mod) => (
              <article
                key={mod.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  selectedModuleId === mod.id
                    ? 'border-brand bg-blue-50/40 dark:border-brand dark:bg-blue-500/10'
                    : 'border-slate-200 bg-surface dark:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                      Módulo #{mod.orden}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{mod.titulo}</h4>
                    {mod.descripcion && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {mod.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      href={maskRoute(
                        `/dashboard?tab=courses&course=${encodeId(selectedCourseId)}&module=${encodeId(mod.id)}`
                      )}
                      variant={selectedModuleId === mod.id ? 'brand' : 'secondary'}
                      size="sm"
                      onClick={() => onSelectModule(mod.id)}
                    >
                      Lecciones
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingModuleId(mod.id);
                        setModuleForm({
                          titulo: mod.titulo,
                          descripcion: mod.descripcion || '',
                          orden: String(mod.orden),
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSoftDeleteModule(mod)}
                    >
                      Archivar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Gestión de Contenidos y Recursos */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Lecciones, videos y recursos (`contents`)
          </p>
          <h3 className="mt-1 text-xl font-black text-foreground">
            Contenidos del módulo ({visibleContents.length})
          </h3>

          <form onSubmit={handleSaveContent} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <Select
                label="Módulo"
                value={effectiveContentModuleId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setContentForm((prev) => ({ ...prev, module_id: e.target.value }))
                }
                placeholder="Selecciona módulo"
                options={courseModules.map((m) => ({
                  value: m.id,
                  label: `${m.orden}. ${m.titulo}`,
                }))}
                required
              />
              <Input
                label="Orden"
                type="number"
                min={1}
                value={contentForm.orden}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setContentForm((prev) => ({ ...prev, orden: e.target.value }))
                }
                required
              />
            </div>

            <Input
              label="Título de la lección o recurso"
              value={contentForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setContentForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Clase 01: Introducción a PostgreSQL"
              required
            />

            <Input
              label="Enlace de Video (YouTube o MP4)"
              type="url"
              value={contentForm.youtube_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setContentForm((prev) => ({
                  ...prev,
                  youtube_url: e.target.value,
                }))
              }
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contenido y enlaces de recursos adicionales
              </label>
              <textarea
                rows={3}
                value={contentForm.cuerpo}
                onChange={(e) =>
                  setContentForm((prev) => ({ ...prev, cuerpo: e.target.value }))
                }
                placeholder="Resumen de clase, instrucciones y URLs de material descargable (PDF, repositorio, guías)."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="brand" size="sm" isLoading={isSaving}>
                {editingContentId ? 'Actualizar Contenido' : 'Agregar Contenido'}
              </Button>
              {editingContentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingContentId(null);
                    setContentForm({
                      module_id: selectedModuleId || '',
                      titulo: '',
                      cuerpo: '',
                      youtube_url: '',
                      orden: '1',
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {visibleContents.map((content) => (
              <article
                key={content.id}
                className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                      Lección #{content.orden}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {content.titulo}
                    </h4>
                    {content.cuerpo && (
                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {content.cuerpo}
                      </p>
                    )}
                    {content.youtube_url && (
                      <p className="mt-1 truncate font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {content.youtube_url}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {content.youtube_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewContent(content)}
                      >
                        Previsualizar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingContentId(content.id);
                        setContentForm({
                          module_id: content.module_id,
                          titulo: content.titulo,
                          cuerpo: content.cuerpo || '',
                          youtube_url: content.youtube_url || '',
                          orden: String(content.orden),
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSoftDeleteContent(content)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {previewContent && (
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">
              Vista previa de recurso multimedia
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewContent(null)}
            >
              Cerrar vista previa
            </Button>
          </div>
          <VideoPlayer
            key={previewContent.id}
            url={previewContent.youtube_url || ''}
            title={previewContent.titulo}
            moduleName="Vista previa docente"
          />
        </section>
      )}

      {/* Crear nuevo curso asignado */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Nuevo curso
        </p>
        <h3 className="mt-1 text-xl font-black text-foreground">
          Registrar nuevo curso bajo tu cátedra
        </h3>
        <form
          onSubmit={handleCreateCourse}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <Input
            label="Título del curso"
            value={courseForm.titulo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, titulo: e.target.value }))
            }
            placeholder="Ej. Arquitectura de Software"
            required
          />
          <Input
            label="Código de asignación"
            value={courseForm.codigo_asignacion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({
                ...prev,
                codigo_asignacion: e.target.value.toUpperCase(),
              }))
            }
            placeholder="Auto si queda vacío"
          />
          <Input
            label="Descripción"
            value={courseForm.descripcion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, descripcion: e.target.value }))
            }
            placeholder="Describe el alcance y competencias del curso"
            required
          />
          <Input
            label="URL de portada (Thumbnail)"
            type="url"
            value={courseForm.thumbnail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, thumbnail: e.target.value }))
            }
            placeholder="https://..."
          />
          <div className="md:col-span-2">
            <Button type="submit" variant="brand" isLoading={isSaving}>
              Publicar Nuevo Curso
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
