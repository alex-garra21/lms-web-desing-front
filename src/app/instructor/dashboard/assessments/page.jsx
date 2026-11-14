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

const emptyQuestion = () => ({
  prompt: '',
  type: 'OPCION_MULTIPLE',
  options: ['', '', '', ''],
  correctIndex: 0,
  weight: '10',
});

export default function InstructorAssessmentsPage() {
  const {
    selectedCourse,
    selectedAssessment,
    selectedAssessmentId,
    setSelectedAssessmentId,
    addAssessment,
    addQuestion,
  } = useInstructor();
  const [form, setForm] = useState({
    title: '',
    moduleId: selectedCourse.modules[0]?.id ?? '',
    minimumScore: '70',
    timeLimit: '30',
    maxAttempts: '3',
    requiresPresenceIoT: true,
  });
  const [question, setQuestion] = useState(emptyQuestion);

  const submitAssessment = (event) => {
    event.preventDefault();
    const minimumScore = Number(form.minimumScore);
    const timeLimit = Number(form.timeLimit);
    const maxAttempts = Number(form.maxAttempts);
    const moduleId = selectedCourse.modules.some((moduleItem) => moduleItem.id === form.moduleId)
      ? form.moduleId
      : selectedCourse.modules[0]?.id;
    if (!form.title.trim() || !moduleId) return;
    if (!Number.isInteger(minimumScore) || minimumScore < 1 || minimumScore > 100
      || !Number.isInteger(timeLimit) || timeLimit < 1
      || !Number.isInteger(maxAttempts) || maxAttempts < 1) return;

    addAssessment({
      moduleId,
      title: form.title.trim(),
      description: 'Evaluación configurada por el instructor.',
      minimumScore,
      timeLimit,
      maxAttempts,
      requiresPresenceIoT: form.requiresPresenceIoT,
    });
    setForm((current) => ({ ...current, title: '' }));
  };

  const submitQuestion = (event) => {
    event.preventDefault();
    const prompt = question.prompt.trim();
    const trimmedOptions = question.options.map((option) => option.trim());
    const validOptions = trimmedOptions
      .map((text, index) => ({ text, index }))
      .filter((option) => option.text);
    const weight = Number(question.weight);
    const optionCountIsValid = question.type === 'VERDADERO_FALSO'
      ? validOptions.length === 2
      : validOptions.length >= 2;
    if (!selectedAssessment || !prompt || !optionCountIsValid
      || !trimmedOptions[question.correctIndex]
      || !Number.isFinite(weight) || weight <= 0) return;

    addQuestion(selectedAssessment.id, {
      prompt,
      type: question.type,
      weight,
      options: validOptions.map((option) => ({
        text: option.text,
        correct: option.index === question.correctIndex,
      })),
    });
    setQuestion(emptyQuestion());
  };

  return (
    <InstructorPage
      eyebrow="Evaluación académica"
      title="Evaluaciones"
      description="Define los parámetros de evaluación, relaciónala con un módulo y administra preguntas de opción múltiple o verdadero/falso."
    >
      <div className="mt-8 max-w-xl">
        <CourseSelect />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <SectionCard title="Crear evaluación" description="Define puntaje mínimo, duración, intentos y si la evaluación requiere validación presencial.">
            <form onSubmit={submitAssessment} className="space-y-4">
              <label className={labelClass}>
                Título
                <input required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Ej. Evaluación del módulo 1" />
              </label>
              <div className={labelClass}>
                <span className="mb-1.5 block">Módulo asociado</span>
                <CustomSelect
                  label=""
                  value={selectedCourse.modules.some((moduleItem) => moduleItem.id === form.moduleId) ? form.moduleId : (selectedCourse.modules[0]?.id ?? '')}
                  onChange={(newValue) => setForm((current) => ({ ...current, moduleId: newValue }))}
                  options={selectedCourse.modules.map((moduleItem) => ({ value: moduleItem.id, label: `${moduleItem.order}. ${moduleItem.title}` }))}
                  fullWidth
                  buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Puntaje mínimo', 'minimumScore', '1', '100'],
                  ['Tiempo (min)', 'timeLimit', '1', '300'],
                  ['Intentos', 'maxAttempts', '1', '10'],
                ].map(([label, field, min, max]) => (
                  <label key={field} className={labelClass}>
                    <span className="text-[11px]">{label}</span>
                    <input required type="number" min={min} max={max} step="1" value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className={inputClass} />
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <input type="checkbox" checked={form.requiresPresenceIoT} onChange={(event) => setForm((current) => ({ ...current, requiresPresenceIoT: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-blue-600" />
                <span>
                  <span className="block text-xs font-bold text-amber-950 dark:text-amber-200">Requiere presencia física (ESP32 + NFC)</span>
                  <span className="mt-1 block text-xs leading-5 text-amber-900 dark:text-amber-200/80">El acceso se habilitaría tras validar la tarjeta del estudiante en el aula.</span>
                </span>
              </label>
              <button type="submit" disabled={!selectedCourse.modules.length} className={primaryButtonClass}>Crear evaluación</button>
              {!selectedCourse.modules.length && <p className="text-xs text-amber-800 dark:text-amber-200">Agrega primero un módulo desde Contenido.</p>}
            </form>
          </SectionCard>
          <SectionCard title={`Evaluaciones de ${selectedCourse.title}`}>
            {selectedCourse.evaluations.length ? (
              <div className="space-y-2">
                {selectedCourse.evaluations.map((assessment) => (
                  <button key={assessment.id} type="button" onClick={() => setSelectedAssessmentId(assessment.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedAssessmentId === assessment.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-400/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'}`}>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{assessment.title}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${assessment.requiresPresenceIoT ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                        {assessment.requiresPresenceIoT ? 'Presencial / NFC' : 'Sin requisito NFC'}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-500">{assessment.questions.length} preguntas · {assessment.timeLimit} min · mínimo {assessment.minimumScore}%</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Este curso aún no tiene evaluaciones.</p>}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Agregar pregunta" description={selectedAssessment ? `Evaluación seleccionada: ${selectedAssessment.title}` : 'Crea o selecciona una evaluación antes de agregar preguntas.'}>
            {selectedAssessment ? (
              <form onSubmit={submitQuestion} className="space-y-4">
                <label className={labelClass}>
                  Enunciado
                  <textarea required rows={3} value={question.prompt} onChange={(event) => setQuestion((current) => ({ ...current, prompt: event.target.value }))} className={`${inputClass} resize-y`} placeholder="Escribe la pregunta" />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                  <div className={labelClass}>
                    <span className="mb-1.5 block">Tipo</span>
                    <CustomSelect
                      label=""
                      value={question.type}
                      onChange={(newValue) => setQuestion((current) => ({ ...current, type: newValue }))}
                      options={[
                        { value: 'OPCION_MULTIPLE', label: 'Opción múltiple' },
                        { value: 'VERDADERO_FALSO', label: 'Verdadero / falso' },
                      ]}
                      fullWidth
                      buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
                    />
                  </div>
                  <label className={labelClass}>
                    Valor en puntos
                    <input type="number" min="0.1" step="0.1" required value={question.weight} onChange={(event) => setQuestion((current) => ({ ...current, weight: event.target.value }))} className={inputClass} />
                  </label>
                </div>
                <fieldset className="space-y-2">
                  <legend className={`${labelClass} mb-2`}>Opciones (marca la respuesta correcta)</legend>
                  {question.options.slice(0, question.type === 'VERDADERO_FALSO' ? 2 : 4).map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="radio" name="correct-answer" checked={question.correctIndex === index} onChange={() => setQuestion((current) => ({ ...current, correctIndex: index }))} aria-label={`Marcar opción ${index + 1} como correcta`} className="h-4 w-4 accent-blue-600" />
                      <input type="text" maxLength={500} value={option} onChange={(event) => setQuestion((current) => ({ ...current, options: current.options.map((value, optionIndex) => optionIndex === index ? event.target.value : value) }))} className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2.5 text-sm text-foreground dark:border-slate-700" placeholder={`Opción ${index + 1}`} />
                    </div>
                  ))}
                </fieldset>
                <button type="submit" className={primaryButtonClass}>Agregar pregunta</button>
              </form>
            ) : <p className="text-sm text-slate-500">Selecciona una evaluación existente o crea una nueva.</p>}
          </SectionCard>
          <SectionCard title="Preguntas configuradas">
            {selectedAssessment?.questions.length ? (
              <ol className="space-y-3">
                {selectedAssessment.questions.map((item, index) => (
                  <li key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">{index + 1}. {item.prompt}</p>
                      <span className="text-xs text-slate-500">{item.weight} pts</span>
                    </div>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {item.options.map((option, optionIndex) => (
                        <li key={`${item.id}-${optionIndex}`} className={`rounded-lg px-3 py-2 text-xs ${option.correct ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {option.correct ? '✓ ' : ''}{option.text}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-slate-500">No se han agregado preguntas a esta evaluación.</p>}
          </SectionCard>
        </div>
      </div>
    </InstructorPage>
  );
}
