// src/app/dashboard/components/shared/FeedbackAlert.tsx
"use client";

import React from 'react';
import { StatusFeedback } from '../../types';

interface FeedbackAlertProps {
  feedback: StatusFeedback | null;
  onClose: () => void;
}

export function FeedbackAlert({ feedback, onClose }: FeedbackAlertProps) {
  if (!feedback) return null;

  return (
    <div
      className={`mt-6 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
        feedback.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
      }`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-bold underline cursor-pointer"
      >
        Cerrar
      </button>
    </div>
  );
}

export default FeedbackAlert;
