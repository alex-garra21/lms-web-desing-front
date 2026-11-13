"use client";

import React, { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import CourseCard from '@/components/CourseCard';
import { maskRoute } from '@/app/utils/routeHasher';
import CustomSelect from '@/components/CustomSelect';

const catalogCourses = [
  {
    id: 101,
    title: 'Desarrollo de Software Seguro y Arquitectura Web',
    description:
      'Aprende a diseñar aplicaciones escalables con seguridad, autenticación y buenas prácticas de software moderno.',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    category: 'Ingeniería de Sistemas',
    level: 'Avanzado',
    duration: '24 horas',
    lessonsCount: 36,
    rating: 4.9,
    reviewsCount: 128,
    format: 'Virtual',
    instructor: {
      name: 'Ing. Carlos Mendoza',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      title: 'Catedrático UMG',
    },
  },
  {
    id: 202,
    title: 'Estructuras de Datos y Algoritmos Avanzados',
    description:
      'Domina estructuras, grafos y análisis algorítmico para resolver problemas reales y desarrollar lógica computacional.',
    thumbnail:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    category: 'Ciencias de la Computación',
    level: 'Intermedio',
    duration: '18 horas',
    lessonsCount: 24,
    rating: 4.8,
    reviewsCount: 94,
    format: 'Mixto',
    instructor: {
      name: 'Dra. Sofía Morales',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      title: 'Investigadora UMG',
    },
  },
  {
    id: 303,
    title: 'Bases de Datos Relacionales y PostgreSQL en la Nube',
    description:
      'Modelado, normalización, consultas avanzadas y seguridad con Row Level Security para aplicaciones profesionales.',
    thumbnail:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    category: 'Bases de Datos',
    level: 'Principiante',
    duration: '15 horas',
    lessonsCount: 20,
    rating: 4.7,
    reviewsCount: 76,
    format: 'Presencial',
    instructor: {
      name: 'Ing. Alejandro Ramos',
      avatar: null,
      title: 'Especialista en Datos',
    },
  },
  {
    id: 404,
    title: 'Diseño UX/UI para Productos Digitales',
    description:
      'Diseña experiencias centradas en el usuario con prototipos, investigación y evaluación de interfaces.',
    thumbnail:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80',
    category: 'Diseño',
    level: 'Intermedio',
    duration: '12 horas',
    lessonsCount: 18,
    rating: 4.9,
    reviewsCount: 110,
    format: 'Virtual',
    instructor: {
      name: 'MSc. Valeria López',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80',
      title: 'Diseñadora Senior',
    },
  },
  {
    id: 505,
    title: 'Fundamentos de IA y Machine Learning Aplicado',
    description:
      'Explora los fundamentos de la inteligencia artificial y aplica modelos prácticos con casos reales de negocio.',
    thumbnail:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    category: 'Inteligencia Artificial',
    level: 'Avanzado',
    duration: '30 horas',
    lessonsCount: 42,
    rating: 5.0,
    reviewsCount: 150,
    format: 'Virtual',
    instructor: {
      name: 'Dr. Esteban García',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      title: 'Profesor de IA',
    },
  },
  {
    id: 606,
    title: 'Marketing Digital y Estrategia de Contenido',
    description:
      'Construye campañas, entiende métricas y crea contenido que convierta con enfoque multidisciplinario.',
    thumbnail:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    category: 'Negocios',
    level: 'Principiante',
    duration: '10 horas',
    lessonsCount: 14,
    rating: 4.6,
    reviewsCount: 63,
    format: 'Mixto',
    instructor: {
      name: 'Lic. Adriana Silva',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
      title: 'Especialista en Marketing',
    },
  },
];

const categories = ['Todos', 'Ingeniería de Sistemas', 'Ciencias de la Computación', 'Bases de Datos', 'Diseño', 'Inteligencia Artificial', 'Negocios'];
const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];
const formats = ['Todos', 'Virtual', 'Presencial', 'Mixto'];

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [selectedFormat, setSelectedFormat] = useState('Todos');
  const [sortBy, setSortBy] = useState('popular');

  const filteredCourses = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();

    return [...catalogCourses]
      .filter((course) => {
        const matchesText =
          !text ||
          course.title.toLowerCase().includes(text) ||
          course.description.toLowerCase().includes(text) ||
          course.instructor.name.toLowerCase().includes(text);

        const matchesCategory =
          selectedCategory === 'Todos' || course.category === selectedCategory;

        const matchesLevel =
          selectedLevel === 'Todos' || course.level === selectedLevel;

        const matchesFormat =
          selectedFormat === 'Todos' || course.format === selectedFormat;

        return matchesText && matchesCategory && matchesLevel && matchesFormat;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.rating - a.rating;
        if (sortBy === 'newest') return b.lessonsCount - a.lessonsCount;
        if (sortBy === 'reviewed') return b.reviewsCount - a.reviewsCount;
        return a.title.localeCompare(b.title, 'es');
      });
  }, [searchTerm, selectedCategory, selectedLevel, selectedFormat, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todos');
    setSelectedLevel('Todos');
    setSelectedFormat('Todos');
    setSortBy('popular');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar currentPath="/courses" />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[30px] bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">Catálogo académico</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Descubre cursos diseñados para tu próximo paso</h1>
            </div>

            <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <span className="text-lg text-sky-300">⌕</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cursos, docentes o temas"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Filtros</h2>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400"
              >
                Limpiar
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Categoría</p>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedCategory === category
                          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{category}</span>
                      {selectedCategory === category && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Nivel</p>
                <div className="flex flex-wrap gap-2">
                  {levels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedLevel === level
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Modalidad</p>
                <div className="space-y-2">
                  {formats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setSelectedFormat(format)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedFormat === format
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{format}</span>
                      {selectedFormat === format && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[26px] border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{filteredCourses.length}</span> cursos
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 rounded-[20px] border border-sky-800 bg-[#08182e] px-4 py-3 text-sm shadow-inner shadow-sky-950/40">
                    <span className="font-semibold text-slate-200">Ordenar por</span>
                    <div className="relative">
                      <CustomSelect 
                            options={[
                              { value: 'popular', label: 'Mejor calificados' },
                              { value: 'reviewed', label: 'Más reseñas' },
                              { value: 'newest', label: 'Más lecciones' },
                              { value: 'title', label: 'Nombre: A-Z' },
                            ]}
                            value={sortBy}
                            onChange={(newValue: React.SetStateAction<string>) => setSortBy(newValue)}
                          />
                      <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-200">▾</span>
                    </div>
                  </div>

                  <Button
                    href={maskRoute('/register')}
                    variant="brand"
                    size="md"
                    className="rounded-[18px] bg-gradient-to-r from-blue-600 to-blue-500 px-5 text-base font-bold shadow-lg shadow-blue-500/25"
                  >
                    Inscribirme hoy
                  </Button>
                </div>
              </div>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    actionText="Ver curso"
                    isEnrolled={false}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl dark:bg-slate-800">🔎</div>
                <h3 className="mt-4 text-xl font-bold">No se encontraron cursos</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Intenta cambiar los filtros o buscar otro título, docente o temática.
                </p>
                <div className="mt-5">
                  <Button onClick={clearFilters} variant="secondary">
                    Volver a todos los cursos
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
