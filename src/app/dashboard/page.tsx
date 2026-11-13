'use client';

import React, { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import { StudentDashboard } from '@/app/pages/private';

/**
 * Ruta /dashboard — Panel del estudiante.
 *
 * Los datos de abajo son DE EJEMPLO para ver la vista. Cuando exista el backend
 * (Supabase) se reemplazan por la sesión y los cursos reales del usuario.
 * El interruptor "Modo demostración" es solo para pruebas; se puede borrar.
 */

const DEMO_USER = {
  name: 'Ana López',
  email: 'alopez@miumg.edu.gt',
  role: 'student',
};

const DEMO_RECOMMENDED = [
  {
    id: 202,
    title: 'Estructuras de Datos y Algoritmos Avanzados',
    description:
      'Domina árboles binarios, grafos y análisis asintótico con aplicaciones prácticas en JavaScript y TypeScript.',
    thumbnail:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    category: 'Ciencias de la Computación',
    level: 'Intermedio',
    duration: '18 horas',
    lessonsCount: 24,
    rating: 4.8,
    reviewsCount: 94,
    price: 'Gratis',
    instructor: { name: 'Dra. Sofía Morales', avatar: null, title: 'Investigadora UMG' },
  },
  {
    id: 303,
    title: 'Bases de Datos Relacionales y PostgreSQL en la Nube',
    description:
      'Modelado entidad-relación, Row Level Security (RLS) y optimización de consultas complejas en Supabase.',
    thumbnail:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    category: 'Bases de Datos',
    level: 'Principiante',
    duration: '15 horas',
    lessonsCount: 20,
    rating: 4.7,
    reviewsCount: 76,
    price: 'Q. 300.00',
    instructor: { name: 'Ing. Alejandro Ramos', avatar: null, title: 'Especialista en Datos' },
  },
];

const DEMO_ENROLLED = [
  {
    id: 101,
    title: 'Desarrollo de Software Seguro y Arquitectura Web',
    description:
      'Aprende a diseñar aplicaciones escalables implementando protección contra IDOR, OWASP Top 10 y autenticación con Supabase.',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    category: 'Ingeniería de Sistemas',
    level: 'Avanzado',
    duration: '24 horas',
    lessonsCount: 36,
    rating: 4.9,
    reviewsCount: 128,
    price: 'Q. 450.00',
    instructor: { name: 'Ing. Carlos Mendoza', avatar: null, title: 'Catedrático UMG' },
    progress: 42,
  },
];

const DEMO_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Inscripciones abiertas',
    date: 'Ciclo 2026',
    text: 'Consulta con Secretaría tu código de asignación de cursos.',
  },
];

export default function DashboardPage() {
  const [hasCourses, setHasCourses] = useState(false);

  return (
    <>
      <Navbar user={DEMO_USER} currentPath="/dashboard" notificationsCount={1} />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Interruptor SOLO para pruebas visuales */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-xs text-muted">
          <span>Modo demostración: {hasCourses ? 'estudiante con cursos' : 'estudiante nuevo (sin cursos)'}</span>
          <button
            type="button"
            onClick={() => setHasCourses((v) => !v)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cambiar vista
          </button>
        </div>

        <StudentDashboard
          user={DEMO_USER}
          enrolledCourses={hasCourses ? DEMO_ENROLLED : []}
          recommendedCourses={DEMO_RECOMMENDED}
          announcements={DEMO_ANNOUNCEMENTS}
          stats={hasCourses ? { lessonsCompleted: 15, studyHours: 6, certificates: 0 } : {}}
          onboarding={{ profileCompleted: hasCourses, visitedCatalog: hasCourses, firstLessonDone: hasCourses }}
        />
      </main>
    </>
  );
}
