"use client";

import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';
import { ToastContainer } from '@/components/Toast';
import { maskRoute } from '@/utils/routeHasher';
import { useInstructor } from './InstructorProvider';

export function InstructorPage({ eyebrow, title, description, actions, children }) {
  const { notice, setNotice } = useInstructor();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <ToastContainer
        toasts={notice ? [{ id: 'instructor-notice', type: 'success', message: notice }] : []}
        onDismiss={() => setNotice('')}
      />
      <header className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-9">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
              {eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{description}</p>
          </div>
          {actions && <div className="relative flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
        Este panel usa datos de demostración en memoria. Los cambios se conservan al navegar por sus secciones, pero se reinician al recargar la página; la conexión con Supabase y ESP32/NFC aún no está activa.
      </div>
      {children}
    </main>
  );
}

export function CourseSelect({ className = '' }) {
  const { courses, selectedCourseId, selectCourse } = useInstructor();
  return (
    <div className={`block text-sm font-semibold text-slate-600 dark:text-slate-300 ${className}`}>
      <span className="mb-1.5 block">Curso</span>
      <CustomSelect
        label=""
        value={selectedCourseId}
        onChange={(newValue) => selectCourse(newValue)}
        options={courses.map((course) => ({ value: course.id, label: course.title }))}
        fullWidth
        buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
      />
    </div>
  );
}

export function MetricCard({ label, value, detail }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
}

export function SectionCard({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-[24px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800 sm:p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function RouteLink({ href, children }) {
  return (
    <Link href={maskRoute(href)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800">
      {children}
    </Link>
  );
}

export const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-surface px-3 py-2.5 text-sm text-foreground dark:border-slate-700';
export const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300';
export const primaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
