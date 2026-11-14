"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import { maskRoute } from '@/utils/routeHasher';

const facultyMembers = [
  {
    name: 'Dr. Carlos Mendoza',
    role: 'Director de Innovación Académica',
    specialty: 'Arquitectura de software y seguridad',
    description:
      'Especialista en sistemas distribuidos y desarrollo de plataformas educativas escalables.',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    initials: 'CM',
    tags: ['Software', 'Seguridad', 'Arquitectura'],
  },
  {
    name: 'Dra. Sofía Morales',
    role: 'Coordinadora de Ciencias de la Computación',
    specialty: 'Algoritmos y análisis de datos',
    description:
      'Acompaña a estudiantes en investigación, programación competitiva y análisis algorítmico.',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    initials: 'SM',
    tags: ['IA', 'Datos', 'Algoritmos'],
  },
  {
    name: 'Ing. Alejandra Gómez',
    role: 'Docente de Bases de Datos',
    specialty: 'PostgreSQL y modelado relacional',
    description:
      'Diseña experiencias de aprendizaje prácticas con PostgreSQL, RLS y optimización de consultas.',
    avatar:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
    initials: 'AG',
    tags: ['SQL', 'RLS', 'Cloud'],
  },
  {
    name: 'MSc. Roberto Pineda',
    role: 'Facilitador de Diseño UX',
    specialty: 'Experiencia de usuario y prototipado',
    description:
      'Conecta diseño, comportamiento y producto con soluciones centradas en la experiencia.',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    initials: 'RP',
    tags: ['UX', 'Diseño', 'Product'],
  },
];

const highlightMetrics = [
  { value: '70+', label: 'docentes expertos' },
  { value: '12k+', label: 'estudiantes activos' },
  { value: '96%', label: 'satisfacción' },
  { value: '18', label: 'áreas de especialidad' },
];

const focusAreas = [
  'Ingeniería de software',
  'Ciencias de datos',
  'UX y diseño digital',
  'Tecnologías emergentes',
  'Investigación aplicada',
  'Mentoría académica',
];

export default function FacultyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar currentPath="/faculty" />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Facultad UMG
              </span>

              <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
                Docentes que impulsan el aprendizaje del futuro.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Un equipo de profesionales con experiencia académica, práctica profesional y enfoque humano para acompañar a cada estudiante en cada etapa de su formación.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href={maskRoute('/courses')} size="lg" variant="brand">
                  Explorar cursos
                </Button>
                <Button href={maskRoute('/register')} size="lg" variant="secondary">
                  Solicitar asesoría
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {focusAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-5 h-36 w-36 rounded-full bg-brand/20 blur-3xl" />
              <div className="absolute -bottom-5 -left-5 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" />

              <div className="relative rounded-[28px] border border-slate-200 bg-surface p-4 shadow-xl dark:border-slate-700">
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                    alt="Equipo docente de la UMG"
                    className="h-[420px] w-full object-cover"
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Perfil destacado
                      </p>
                      <h2 className="mt-2 text-xl font-black text-foreground">Docencia aplicada</h2>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                      +18 años
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Integramos teoría, laboratorio y acompañamiento cercano para formar profesionales competitivos en el mercado global.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlightMetrics.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-surface p-5 text-center shadow-sm dark:border-slate-800"
            >
              <div className="text-3xl font-black text-foreground">{stat.value}</div>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Nuestro claustro</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                Profesores con experiencia en aula y práctica real.
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Todos', 'Ingeniería', 'Datos', 'UX', 'Investigación'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    filter === 'Todos'
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand/70 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {facultyMembers.map((member) => (
              <article
                key={member.name}
                className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(37,99,235,0.16)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900 p-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),transparent_35%)]" />
                  <div className="relative flex items-center justify-between">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                      {member.role.split(' ')[0]}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                      UMG
                    </span>
                  </div>

                  <div className="relative mt-6 flex items-center justify-center">
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white/70 bg-white shadow-lg shadow-sky-950/30">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 text-xl font-black text-blue-800">
                          {member.initials}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-xl font-black leading-tight text-foreground">{member.name}</h3>
                    <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>
                  </div>

                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{member.description}</p>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Especialidad
                    </p>
                    <p className="mt-2 text-sm font-bold text-foreground">{member.specialty}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {member.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Button
                    href={maskRoute('/courses')}
                    variant="secondary"
                    size="md"
                    className="mt-3 w-full rounded-2xl"
                  >
                    Ver cursos
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Nuestra metodología</p>
            <h3 className="mt-3 text-3xl font-black text-foreground">Aprendizaje activo, mentoring y resultados medibles.</h3>

            <div className="mt-6 space-y-4">
              {[
                'Mentoría cercana con seguimiento académico y orientación profesional.',
                'Proyectos aplicados para desarrollar competencias reales y trabajo en equipo.',
                'Acompañamiento práctico desde la primera clase hasta la certificación final.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-black text-brand">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-brand/10 via-sky-50 to-white p-6 shadow-sm dark:border-slate-800 dark:from-blue-500/10 dark:via-slate-900 dark:to-slate-900">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">¿Necesitas orientación?</p>
            <h3 className="mt-3 text-3xl font-black text-foreground">Conoce a tu mentor ideal.</h3>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Nuestro equipo de docentes te ayudará a definir tu ruta académica según tus metas, intereses y nivel actual.
            </p>

            <div className="mt-6 space-y-3">
              <Button href={maskRoute('/register')} variant="brand" size="lg" fullWidth>
                Inscribirme ahora
              </Button>
              <Button href={maskRoute('/courses')} variant="secondary" size="lg" fullWidth>
                Ver catálogo
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
