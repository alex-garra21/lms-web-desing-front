"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import CourseCard from '@/components/CourseCard';
import { maskRoute } from '@/utils/routeHasher';

const SAMPLE_COURSES = [
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
      'Domina árboles, grafos y análisis algorítmico con enfoque práctico en JavaScript y TypeScript.',
    thumbnail:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    category: 'Ciencias de la Computación',
    level: 'Intermedio',
    duration: '18 horas',
    lessonsCount: 24,
    rating: 4.8,
    reviewsCount: 94,
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
      'Aprende modelado de datos, RLS y optimización de consultas para aplicaciones reales en entornos modernos.',
    thumbnail:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    category: 'Bases de Datos',
    level: 'Principiante',
    duration: '15 horas',
    lessonsCount: 20,
    rating: 4.7,
    reviewsCount: 76,
    instructor: {
      name: 'Ing. Alejandro Ramos',
      avatar: null,
      title: 'Especialista en Datos',
    },
  },
];

const features = [
  {
    title: 'Clases en vivo y grabadas',
    description: 'Accede a lecciones semanales, sesiones guiadas y material de apoyo desde cualquier dispositivo.',
    icon: '🎓',
  },
  {
    title: 'Aprendizaje flexible',
    description: 'Estudia a tu ritmo con planes por módulo, evaluaciones y seguimiento académico automatizado.',
    icon: '⏱️',
  },
  {
    title: 'Soporte académico',
    description: 'Recibe atención docente, retroalimentación y coordinación con campus, secretaria y administración.',
    icon: '🤝',
  },
];

const stats = [
  { label: 'Estudiantes activos', value: '12k+' },
  { label: 'Cursos disponibles', value: '180+' },
  { label: 'Satisfacción', value: '96%' },
  { label: 'Docentes expertos', value: '70+' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar currentPath="/" />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Campus virtual UMG
              </span>

              <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
                El futuro de tu educación empieza aquí.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Accede a una experiencia académica moderna con cursos, tutorías, evaluaciones y acompañamiento docente pensado para formar líderes del mañana.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href={maskRoute('/courses')} size="lg" variant="brand">
                  Explorar cursos
                </Button>
                <Button href={maskRoute('/register')} size="lg" variant="secondary">
                  Inscribirme ahora
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Clases online y presenciales
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Certificados reconocidos
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-5 h-32 w-32 rounded-full bg-brand/20 blur-3xl" />
              <div className="absolute -bottom-5 -left-5 h-32 w-32 rounded-full bg-sky-400/20 blur-3xl" />

              <div className="relative rounded-[28px] border border-slate-200 bg-surface p-4 shadow-xl dark:border-slate-700">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
                    alt="Estudiantes en aula"
                    className="h-[420px] w-full object-cover"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-2xl font-black text-brand">+18k</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Horas de aprendizaje</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-2xl font-black text-brand">4.9/5</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Experiencia estudiantil</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">¿Por qué elegir UMG?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">Educación con enfoque real y resultados medibles</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 dark:border-slate-800"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-3xl">{feature.icon}</div>
                <h3 className="mt-5 text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Cursos destacados</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Aprende lo que más demanda tu futuro</h2>
            </div>
            <Button href={maskRoute('/courses')} variant="ghost">
              Ver catálogo completo
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {SAMPLE_COURSES.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                actionText="Ver curso"
                isEnrolled={false}
              />
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[30px] border border-slate-200 bg-slate-900 px-6 py-8 text-white shadow-xl dark:border-slate-700 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Comienza hoy</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Tu próxima etapa académica te está esperando.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Únete a una plataforma universitaria moderna, segura y pensada para acompañarte desde la primera clase hasta la certificación final.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button href={maskRoute('/register')} size="lg" variant="brand">
                Crear cuenta
              </Button>
              <Button href={maskRoute('/login')} size="lg" variant="secondary" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">
                Ya tengo cuenta
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
