// src/app/dashboard/components/shared/DashboardMetrics.tsx
"use client";

import React from 'react';
import { DashboardMetricItem } from '../../types';

interface DashboardMetricsProps {
  metrics: DashboardMetricItem[];
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <section
      aria-label="Resumen institucional"
      className={`grid gap-4 ${
        metrics.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
      }`}
    >
      {metrics.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800"
        >
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-black text-foreground">
            {item.value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {item.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

export default DashboardMetrics;
