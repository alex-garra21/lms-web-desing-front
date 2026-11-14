// src/app/dashboard/components/shared/DashboardAuthRequired.tsx
"use client";

import React from 'react';
import Button from '@/components/Button';
import { maskRoute } from '@/utils/routeHasher';

interface DashboardAuthRequiredProps {
  sessionError?: string;
}

export function DashboardAuthRequired({ sessionError }: DashboardAuthRequiredProps) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 p-8 text-white shadow-xl shadow-blue-950/10">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Acceso Institucional Protegido
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Inicia sesión para acceder a tu panel LMS UMG
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
          {sessionError ||
            'Los módulos académicos, administrativos y de auditoría requieren una sesión autenticada en Supabase.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={maskRoute('/login')} variant="brand" size="md">
            Iniciar Sesión
          </Button>
          <Button
            href={maskRoute('/courses')}
            variant="secondary"
            size="md"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            Ver Catálogo Público
          </Button>
        </div>
      </div>
    </section>
  );
}

export default DashboardAuthRequired;
