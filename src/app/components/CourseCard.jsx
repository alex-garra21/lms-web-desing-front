"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import { createMaskedUrl } from '../utils/routeHasher';

/**
 * @typedef {Object} CourseCardProps
 * @property {Object} [course]
 * @property {number} [progress]
 * @property {boolean} [isEnrolled]
 * @property {string} [actionText]
 * @property {string} [actionHref]
 * @property {Function} [onAction]
 * @property {string} [className]
 */

/**
 * @param {CourseCardProps} props
 */
export function CourseCard({
  course = {},
  progress,
  isEnrolled = false,
  actionText,
  actionHref,
  onAction,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  const {
    id = 1,
    title = 'Curso sin título',
    description,
    thumbnail,
    category = 'General',
    level = 'Todos los niveles',
    duration = 'Auto-estudio',
    lessonsCount = 0,
    rating = 5.0,
    reviewsCount = 0,
    instructor = {
      name: 'Facultad de Ingeniería',
      avatar: null,
      title: 'Docente UMG',
    },
  } = course;

  const defaultHref = isEnrolled
    ? createMaskedUrl('/courses', id, { view: 'player' })
    : createMaskedUrl('/courses', id);

  const finalHref = actionHref || defaultHref;
  const finalActionText =
    actionText || (isEnrolled ? 'Continuar Lección' : 'Ver curso');

  const hasProgress = typeof progress === 'number' && progress >= 0;

  return (
    <article
      className={`group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_52px_rgba(37,99,235,0.18)] dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <Link href={finalHref} className="relative block aspect-[16/10] overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-slate-950/5" />

        {thumbnail && !imgError ? (
          <img
            src={thumbnail}
            alt={title}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand/90 via-slate-900 to-slate-950 p-6 text-center text-white">
            <svg
              className="mb-2 h-12 w-12 text-white/80 transition-transform duration-300 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              {category}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
          <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {category}
          </span>
          <span className="rounded-full bg-[#1d4ed8]/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-blue-900/30">
            {level}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-start gap-3 p-3">
          <span className="rounded-full bg-slate-950/55 px-2.5 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-sm">
            {duration}
          </span>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-base text-amber-500">★</span>
            {rating.toFixed(1)}
          </span>
          <span>{reviewsCount} reseñas</span>
          <span>{lessonsCount} lecciones</span>
        </div>

        <div>
          <h3 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
            <Link href={finalHref} className="focus:outline-none">
              {title}
            </Link>
          </h3>
          {description && (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            {instructor.avatar ? (
              <img
                src={instructor.avatar}
                alt={instructor.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                {instructor.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                {instructor.name}
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {instructor.title || 'Docente UMG'}
              </p>
            </div>
          </div>
        </div>

        {hasProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          href={finalHref}
          variant={isEnrolled ? 'brand' : 'secondary'}
          size="md"
          className={`w-full ${isEnrolled ? 'rounded-2xl' : 'rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200'}`}
          onClick={onAction}
        >
          {finalActionText}
        </Button>
      </div>
    </article>
  );
}

export default CourseCard;
