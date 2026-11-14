"use client";

import { useState } from 'react';
import { useInstructor } from '../InstructorProvider';
import {
  CourseSelect,
  InstructorPage,
  SectionCard,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '../InstructorUI';

export default function InstructorContentPage() {
  const {
    selectedCourse,
    selectedModule,
    selectedModuleId,
    setSelectedModuleId,
    addModule,
    addLesson,
  } = useInstructor();
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', duration: '10' });

  const submitModule = (event) => {
    event.preventDefault();
    const title = moduleTitle.trim();
    if (!title) return;
    addModule(title);
    setModuleTitle('');
  };

  const submitLesson = (event) => {
    event.preventDefault();
    const title = lessonForm.title.trim();
    const content = lessonForm.content.trim();
    const duration = Number(lessonForm.duration);
    if (!selectedModule || !title || !content || !Number.isInteger(duration) || duration < 0) return;
    addLesson(selectedModule.id, { title, content, duration });
    setLessonForm({ title: '', content: '', duration: '10' });
  };

  return (
    <InstructorPage
      eyebrow="Diseño instruccional"
      title="Contenido del curso"
      description="Organiza el aprendizaje en módulos y lecciones. El orden se asigna automáticamente a medida que agregas contenido."
    >
      <div className="mt-8 max-w-xl">
        <CourseSelect />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <SectionCard title="Módulos" description={selectedCourse ? `Estructura de ${selectedCourse.title}` : 'Selecciona un curso para comenzar.'}>
            <form onSubmit={submitModule} className="flex flex-col gap-3 sm:flex-row">
              <label className={`${labelClass} flex-1`}>
                Nombre del módulo
                <input required maxLength={200} value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} className={inputClass} placeholder="Ej. Fundamentos" />
              </label>
              <button type="submit" className={`${primaryButtonClass} self-end`}>Agregar módulo</button>
            </form>
            {selectedCourse.modules.length ? (
              <ol className="mt-5 space-y-2">
                {selectedCourse.modules.map((moduleItem) => (
                  <li key={moduleItem.id}>
                    <button type="button" onClick={() => setSelectedModuleId(moduleItem.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedModuleId === moduleItem.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-400/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'}`}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">{moduleItem.order}. {moduleItem.title}</span>
                        <span className="text-xs text-slate-500">{moduleItem.lessons.length} lecciones</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm text-slate-500">Este curso aún no tiene módulos.</p>}
          </SectionCard>
          <SectionCard title="Lecciones del módulo" description={selectedModule ? `Módulo ${selectedModule.order}: ${selectedModule.title}` : 'Agrega un módulo para comenzar a crear lecciones.'}>
            {selectedModule?.lessons.length ? (
              <ol className="space-y-3">
                {selectedModule.lessons.map((lesson) => (
                  <li key={lesson.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="text-sm font-bold text-foreground">{lesson.order}. {lesson.title}</h3>
                      <span className="text-xs text-slate-500">{lesson.duration} min</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{lesson.content}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-slate-500">El módulo seleccionado no tiene lecciones todavía.</p>}
          </SectionCard>
        </div>
        <SectionCard title="Agregar lección" description={selectedModule ? `Se agregará a “${selectedModule.title}”.` : 'Primero crea o selecciona un módulo.'}>
          <form onSubmit={submitLesson} className="space-y-4">
            <label className={labelClass}>
              Título
              <input required maxLength={200} value={lessonForm.title} onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Nombre de la lección" />
            </label>
            <label className={labelClass}>
              Contenido
              <textarea required rows={6} value={lessonForm.content} onChange={(event) => setLessonForm((current) => ({ ...current, content: event.target.value }))} className={`${inputClass} resize-y`} placeholder="Resumen, instrucciones o material principal" />
            </label>
            <label className={labelClass}>
              Duración estimada (minutos)
              <input required type="number" min="0" step="1" value={lessonForm.duration} onChange={(event) => setLessonForm((current) => ({ ...current, duration: event.target.value }))} className={inputClass} />
            </label>
            <button type="submit" disabled={!selectedModule} className={primaryButtonClass}>Agregar lección</button>
          </form>
        </SectionCard>
      </div>
    </InstructorPage>
  );
}
