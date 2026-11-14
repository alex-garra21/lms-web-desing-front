// src/app/dashboard/components/shared/DashboardLoading.tsx
"use client";

import React from 'react';

interface DashboardLoadingProps {
  message?: string;
}

export function DashboardLoading({
  message = 'Validando sesión institucional y cargando módulos desde Supabase...',
}: DashboardLoadingProps) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-surface p-10 text-center shadow-sm dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </section>
  );
}

export default DashboardLoading;
