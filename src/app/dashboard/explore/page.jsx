"use client";

import { useMemo, useState } from 'react';
import Button from '@/components/Button';
import StudentShell from '../StudentShell';
import { catalogCourses } from '../studentData';
import { maskRoute } from '@/app/utils/routeHasher';

const categories = ['Todas', ...new Set(catalogCourses.map((course) => course.category))];

export default function StudentExplorePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [expandedCourse, setExpandedCourse] = useState(null);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalogCourses.filter((course) => {
      const matchesCategory = category === 'Todas' || course.category === category;
      const matchesSearch = !query || [
        course.title,
        course.category,
        course.instructor,
        course.description,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <StudentShell currentPath="/dashboard/explore">
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Catálogo académico</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Explora nuevas rutas de aprendizaje</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
            Compara objetivos, módulos, modalidad y nivel antes de elegir qué curso quieres consultar.
          </p>
          <label className="mt-6 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <span aria-hidden="true" className="text-sky-300">⌕</span>
            <span className="sr-only">Buscar cursos</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por curso, área o instructor"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-300"
            />
          </label>
        </section>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground">Cursos disponibles</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filteredCourses.length} opciones para explorar</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por área">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${category === item ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-surface text-slate-600 hover:border-brand dark:border-slate-700 dark:text-slate-300'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filteredCourses.length ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {filteredCourses.map((course) => (
              <article key={course.id} className="rounded-[26px] border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    {course.category}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{course.format} · {course.level}</span>
                </div>
                <h3 className="mt-4 text-xl font-extrabold text-foreground">{course.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Instructor</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{course.instructor}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Duración y estructura</p>
                    <p className="mt-1 text-xs font-bold text-foreground">{course.duration} · {course.modules} módulos</p>
                  </div>
                </div>

                {expandedCourse === course.id && (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-foreground">Al finalizar podrás</h4>
                    <ul className="mt-2 space-y-2">
                      {course.outcomes.map((outcome) => (
                        <li key={outcome} className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          <span className="text-emerald-500">✓</span>{outcome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                  >
                    {expandedCourse === course.id ? 'Ocultar objetivos' : 'Ver objetivos'}
                  </Button>
                  <Button href={maskRoute('/faculty')} variant="ghost" size="sm">
                    Conocer docentes
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <h3 className="font-bold text-foreground">No encontramos cursos con esos criterios</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Prueba con otro término o selecciona “Todas”.</p>
            <button type="button" onClick={() => { setSearch(''); setCategory('Todas'); }} className="mt-4 text-sm font-semibold text-brand">
              Limpiar búsqueda
            </button>
          </div>
        )}

        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          El catálogo es demostrativo. La solicitud de inscripción y la disponibilidad real de cursos deben confirmarse con Secretaría Académica.
        </p>
      </main>
    </StudentShell>
  );
}
