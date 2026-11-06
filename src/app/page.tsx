"use client";

import React, { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import Button from '@/app/components/Button';
import Input from '@/app/components/Input';
import Select from '@/app/components/Select';
import CourseCard from '@/app/components/CourseCard';
import VideoPlayer from '@/app/components/VideoPlayer';
import {
  encodeId,
  decodeId,
  maskRoute,
  unmaskRoute,
  isValidMaskedId,
} from '@/app/utils/routeHasher';
import { Login, Register } from '@/app/pages/public';

// Cursos de ejemplo para demostración de catálogo y modo inscrito
const SAMPLE_COURSES = [
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
    instructor: {
      name: 'Ing. Alejandro Ramos',
      avatar: null,
      title: 'Especialista en Datos',
    },
  },
];

export default function Home() {
  // Estado para alternar simulación de usuario logueado en Navbar
  const [simulateAuth, setSimulateAuth] = useState(false);
  const [activeView, setActiveView] = useState<'showcase' | 'login' | 'register'>('showcase');

  // Estados para pruebas interactivas de Input / Select / Button
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('2026-1');
  const [btnLoading, setBtnLoading] = useState(false);

  // Estados interactivos para el verificador de routeHasher
  const [testInputId, setTestInputId] = useState('1054');
  const [maskedOutput, setMaskedOutput] = useState(() => encodeId('1054'));
  const [tamperValue, setTamperValue] = useState('');
  const [unmaskTestPath, setUnmaskTestPath] = useState(
    '/courses/1024/lessons/5080'
  );

  const currentUser = simulateAuth
    ? {
      name: 'Alex Garra',
      email: 'agarra@miumg.edu.gt',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'Estudiante',
    }
    : null;

  const handleHashEncode = () => {
    const encoded = encodeId(testInputId);
    setMaskedOutput(encoded);
    setTamperValue(encoded);
  };

  // Renderizar vistas independientes si se seleccionan
  if (activeView === 'login') {
    return (
      <div className="relative">
        <div className="fixed top-4 left-4 z-50">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActiveView('showcase')}
            className="shadow-md"
          >
            ← Volver al Showcase
          </Button>
        </div>
        <Login
          onLoginSuccess={() => {
            setSimulateAuth(true);
            setActiveView('showcase');
          }}
        />
      </div>
    );
  }

  if (activeView === 'register') {
    return (
      <div className="relative">
        <div className="fixed top-4 left-4 z-50">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActiveView('showcase')}
            className="shadow-md"
          >
            ← Volver al Showcase
          </Button>
        </div>
        <Register
          onRegisterSuccess={() => {
            setActiveView('login');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* 1. NAVBAR (RESPONSIVE, PUBLIC/AUTH, DARK MODE TOGGLE) */}
      <Navbar
        user={currentUser}
        onLogout={() => setSimulateAuth(false)}
        notificationsCount={3}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* PANEL DE CONTROL DE PRUEBAS / ESTADO */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                LMS UMG Showcase
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Plataforma Virtual Universitaria
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Componentes base implementados con Tailwind CSS, soporte estricto de Dark Mode y ofuscación de rutas anti-IDOR.
              </p>
            </div>

            {/* Controles interactivos de vistas y sesión */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView('login')}
                >
                  Vista Login
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView('register')}
                >
                  Vista Registro
                </Button>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <Button
                  size="sm"
                  variant={simulateAuth ? 'brand' : 'ghost'}
                  onClick={() => setSimulateAuth(!simulateAuth)}
                >
                  {simulateAuth ? '👨‍🎓 Estudiante' : '👤 Invitado'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. REPRODUCTOR DE VIDEO RESPONSIVE 16:9 (YOUTUBE & HTML5) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Reproductor de Lecciones (VideoPlayer)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Relación de aspecto 16:9, soporte seguro para YouTube sin cookies de rastreo y controles académicos.
              </p>
            </div>
          </div>

          <VideoPlayer
            url="https://youtu.be/JHW4gVn59-k"
            moduleName="Módulo 3: Seguridad en APIs y Prevención de IDOR adfklasdflk"
            title="Clase Magistral: Arquitectura Web Segura y Control de Acceso"
            onComplete={(completed: boolean) =>
              alert(`Estado de la lección actualizado: ${completed ? 'Completada' : 'Pendiente'}`)
            }
            onPrev={() => alert('Navegando a lección anterior')}
            onNext={() => alert('Navegando a lección siguiente')}
          />
        </section>

        {/* 3. CATÁLOGO DE CURSOS (COURSECARD) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Cursos Disponibles (CourseCard)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualización de miniaturas, metadatos, barras de avance académico y URLs ofuscadas.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Mostrando {SAMPLE_COURSES.length} cursos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_COURSES.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={index === 0}
                progress={index === 0 ? 68 : undefined}
                actionText={index === 0 ? 'Continuar Clase' : 'Inscribirme'}
              />
            ))}
          </div>
        </section>

        {/* 4. FORMULARIOS Y CONTROLES BASE (INPUT, SELECT, BUTTON) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Controles de Formulario (Input, Select, Button)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estilizados con variables semánticas de globals.css y soporte nativo de Dark Mode.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Búsqueda de Asignaturas"
              placeholder="Ej: Redes, Inteligencia Artificial..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              helperText="Busca por título o nombre de docente"
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />

            <Select
              label="Ciclo Académico"
              value={selectedSemester}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSemester(e.target.value)}
              helperText="Filtra por período semestral vigente"
              options={[
                { value: '2026-1', label: 'Primer Semestre 2026' },
                { value: '2026-2', label: 'Segundo Semestre 2026' },
                { value: '2025-2', label: 'Segundo Semestre 2025' },
              ]}
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />

            <Input
              label="Validación de Carné (Error)"
              defaultValue="0900-XX-INVALID"
              required
              error="El formato del carné no corresponde al padrón activo de UMG"
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              }
            />
          </div>

          {/* Variantes de Botones */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Variantes del Componente Button
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="brand">Brand Principal</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Borde Outline</Button>
              <Button variant="ghost">Fantasma / Ghost</Button>
              <Button variant="success">Éxito</Button>
              <Button variant="danger">Peligro</Button>
              <Button
                variant="brand"
                isLoading={btnLoading}
                onClick={() => {
                  setBtnLoading(true);
                  setTimeout(() => setBtnLoading(false), 2000);
                }}
              >
                {btnLoading ? 'Procesando...' : 'Probar Loading'}
              </Button>
            </div>
          </div>
        </section>

        {/* 5. CONSOLA DE SEGURIDAD Y ROUTE HASHER (ANTI-IDOR) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Consola de Seguridad: Route Hasher & Anti-IDOR
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ofuscación criptográfica bidireccional con checksum FNV-1a para proteger recursos en URLs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Prueba de Enmascaramiento de ID */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                1. Enmascarar ID
              </span>
              <div className="flex gap-2">
                <Input
                  value={testInputId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestInputId(e.target.value)}
                  placeholder="ID plano (ej: 1054, curso_abc)"
                />
                <Button variant="brand" onClick={handleHashEncode}>
                  Ofuscar
                </Button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Hash Generado:</span>
                <p className="font-mono text-xs bg-surface p-2 rounded-lg border border-slate-200 dark:border-slate-700 break-all text-brand font-bold select-all">
                  {maskedOutput}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Resultado de Desofuscación:</span>
                <p className="font-mono text-xs bg-surface p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold">
                  {decodeId(maskedOutput) ?? '❌ Inválido'}
                </p>
              </div>
            </div>

            {/* Prueba de Manipulación / Detección Anti-Tamper */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                2. Verificación Anti-Tampering (IDOR Attack Simulator)
              </span>
              <p className="text-xs text-slate-500">
                Altera cualquier carácter del hash generado abajo para verificar cómo el checksum bloquea el acceso:
              </p>
              <Input
                value={tamperValue || maskedOutput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTamperValue(e.target.value)}
                placeholder="Modifica caracteres aquí..."
              />

              <div className="flex items-center justify-between p-3 rounded-xl border bg-surface">
                <span className="text-xs font-semibold">Integridad de Acceso:</span>
                {isValidMaskedId(tamperValue || maskedOutput) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Válido (ID: {decodeId(tamperValue || maskedOutput)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Ataque Detectado: Acceso Rechazado (null)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prueba de Rutas Completas */}
          <div className="pt-2 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              3. Enmascaramiento y Desenmascaramiento de Rutas de la Aplicación
            </span>
            <Input
              label="Probar Ruta con IDs de Recursos"
              value={unmaskTestPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnmaskTestPath(e.target.value)}
              placeholder="/courses/1024/lessons/5080"
              helperText="Escribe cualquier ruta con identificadores numéricos o UUIDs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500">Ruta Ofuscada (URL Segura):</span>
                <p className="font-mono text-xs text-brand mt-1 truncate">
                  {maskRoute(unmaskTestPath)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500">Ruta Recuperada en Servidor:</span>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {unmaskRoute(maskRoute(unmaskTestPath))}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
