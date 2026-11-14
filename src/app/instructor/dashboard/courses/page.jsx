"use client";

import { useState } from 'react';
import CustomSelect from '@/components/CustomSelect';
import { useInstructor } from '../InstructorProvider';
import {
  CourseSelect,
  InstructorPage,
  SectionCard,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '../InstructorUI';
import { courseStatuses } from '../instructorData';

export default function InstructorCoursesPage() {
  const { courses, selectedCourse, addCourse, updateCourse, enrollmentMetrics } = useInstructor();
  const [form, setForm] = useState({ title: '', description: '' });
  const submitCourse = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || !description) return;
    addCourse({ title, description });
    setForm({ title: '', description: '' });
  };

  return (
    <InstructorPage
      eyebrow="Administración académica"
      title="Cursos"
      description="Crea cursos, mantén su información clara y controla si están en borrador, publicados o archivados."
    >
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Crear curso" description="Los cursos nuevos comienzan como borrador para que puedas organizarlos antes de publicarlos.">
          <form onSubmit={submitCourse} className="space-y-4">
            <label className={labelClass}>
              Título del curso
              <input required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Ej. Desarrollo de aplicaciones web" />
            </label>
            <label className={labelClass}>
              Descripción
              <textarea required maxLength={1200} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} resize-y`} placeholder="Describe qué aprenderán los estudiantes" />
            </label>
            <button type="submit" className={primaryButtonClass}>Crear curso</button>
          </form>
        </SectionCard>

        <SectionCard title="Resumen del curso seleccionado" description="Actualiza el estado desde el selector y revisa sus módulos y evaluaciones.">
          <CourseSelect />
          {selectedCourse && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Estado</p>
                <p className="mt-1 font-bold text-foreground">{courseStatuses.find((status) => status.value === selectedCourse.status)?.label}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Módulos</p>
                <p className="mt-1 font-bold text-foreground">{selectedCourse.modules.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Evaluaciones</p>
                <p className="mt-1 font-bold text-foreground">{selectedCourse.evaluations.length}</p>
              </div>
              <div className={`${labelClass} sm:col-span-3`}>
                <span className="mb-1.5 block">Estado del curso</span>
                <CustomSelect
                  label=""
                  value={selectedCourse.status}
                  onChange={(newValue) => updateCourse(selectedCourse.id, (course) => ({ ...course, status: newValue }))}
                  options={courseStatuses.map((status) => ({ value: status.value, label: status.label }))}
                  fullWidth
                  buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
                />
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 sm:col-span-3">{selectedCourse.description}</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Cursos asignados" description="Inscripciones y progreso son métricas de ejemplo; los cursos y estados se mantienen mientras no recargues." className="mt-5">
        {courses.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const students = enrollmentMetrics.filter((item) => item.courseId === course.id);
              const progress = students.length ? Math.round(students.reduce((sum, item) => sum + item.progress, 0) / students.length) : 0;
              return (
                <article key={course.id} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-foreground">{course.title}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.instructor}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-400/10 dark:text-blue-200">
                      {courseStatuses.find((status) => status.value === course.status)?.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>{students.length} inscripciones de muestra</span>
                    <span>{progress}% progreso promedio</span>
                    <span>{course.modules.length} módulos</span>
                    <span>{course.evaluations.length} evaluaciones</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className="text-sm text-slate-500">Aún no hay cursos. Crea el primero con el formulario.</p>}
      </SectionCard>
    </InstructorPage>
  );
}
