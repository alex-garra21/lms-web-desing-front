"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import { createMaskedUrl } from '../utils/routeHasher';

/**
 * Componente CourseCard para el LMS UMG.
 * Presenta miniaturas, título, información del docente, metadatos académicos,
 * barra de progreso para estudiantes inscritos y botón de acción con URLs
 * ofuscadas contra ataques IDOR.
 * 
 * @param {Object} props
 * @param {Object} props.course - Objeto con los datos del curso
 * @param {string|number} props.course.id - ID original del curso
 * @param {string} props.course.title - Título del curso
 * @param {string} [props.course.description] - Breve descripción del curso
 * @param {string} [props.course.thumbnail] - URL de la imagen de portada
 * @param {string} [props.course.category] - Categoría (ej: "Ingeniería de Software")
 * @param {string} [props.course.level] - Nivel ("Principiante", "Intermedio", "Avanzado")
 * @param {string|number} [props.course.duration] - Duración estimada (ej: "18 horas")
 * @param {number} [props.course.lessonsCount] - Cantidad de lecciones
 * @param {number} [props.course.rating] - Calificación (ej: 4.8)
 * @param {number} [props.course.reviewsCount] - Número de reseñas
 * @param {string} [props.course.price] - Precio o "Gratis"
 * @param {Object} [props.course.instructor] - Datos del instructor { name, avatar, title }
 * @param {number} [props.progress] - Porcentaje de avance (0 a 100) si es alumno inscrito
 * @param {boolean} [props.isEnrolled] - Indica si el usuario actual está inscrito
 * @param {string} [props.actionText] - Texto personalizado para el botón
 * @param {string} [props.actionHref] - Enlace directo alternativo
 * @param {Function} [props.onAction] - Callback al presionar el botón de acción
 * @param {string} [props.className] - Clases adicionales de Tailwind
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
    price = 'Gratis',
    instructor = {
      name: 'Facultad de Ingeniería',
      avatar: null,
      title: 'Docente UMG',
    },
  } = course;

  // Rutas enmascaradas para prevenir ataques IDOR en URLs de navegación
  const defaultHref = isEnrolled
    ? createMaskedUrl('/courses', id, { view: 'player' })
    : createMaskedUrl('/courses', id);

  const finalHref = actionHref || defaultHref;
  const finalActionText =
    actionText || (isEnrolled ? 'Continuar Lección' : 'Ver Detalles');

  const hasProgress = typeof progress === 'number' && progress >= 0;

  return (
    <article
      className={`
        group flex flex-col justify-between overflow-hidden rounded-2xl
        border border-slate-200 dark:border-slate-800
        bg-surface text-foreground
        shadow-sm hover:shadow-xl hover:border-brand/40 dark:hover:border-brand/40
        transition-all duration-300
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Contenedor Superior: Miniatura y Badges */}
      <div>
        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
          {thumbnail && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumbnail}
              alt={title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            // Placeholder estilizado con gradiente brand
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand/90 via-slate-900 to-slate-950 p-6 text-center text-white">
              <svg
                className="h-12 w-12 text-white/80 mb-2 transform transition-transform duration-300 group-hover:scale-110"
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
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                {category}
              </span>
            </div>
          )}

          {/* Badges superiores flotantes */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-xs font-medium text-white shadow-sm border border-white/10">
              {category}
            </span>
            <span className="rounded-full bg-brand/90 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {level}
            </span>
          </div>

          {/* Badge de precio o inscripción en la esquina inferior */}
          {!isEnrolled && (
            <div className="absolute bottom-3 right-3 pointer-events-none">
              <span className="rounded-lg bg-surface/90 dark:bg-surface/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-brand shadow-md border border-slate-200 dark:border-slate-700">
                {price}
              </span>
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div className="p-5">
          {/* Título */}
          <h3 className="text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand line-clamp-2">
            <Link href={finalHref} className="focus:outline-none focus:underline">
              {title}
            </Link>
          </h3>

          {/* Descripción corta */}
          {description && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
              {description}
            </p>
          )}

          {/* Docente / Instructor */}
          <div className="mt-4 flex items-center gap-2.5">
            {instructor.avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={instructor.avatar}
                alt={instructor.name}
                className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">
                {instructor.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-foreground truncate">
                {instructor.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {instructor.title || 'Docente UMG'}
              </span>
            </div>
          </div>

          {/* Metadatos (Duración, Lecciones, Calificación) */}
          <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400">
            {/* Duración */}
            <div className="flex items-center gap-1.5" title="Duración estimada">
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{duration}</span>
            </div>

            {/* Lecciones */}
            {lessonsCount > 0 && (
              <div className="flex items-center gap-1.5" title="Total de lecciones">
                <svg
                  className="h-3.5 w-3.5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span>{lessonsCount} lecciones</span>
              </div>
            )}

            {/* Calificación */}
            {rating > 0 && (
              <div className="flex items-center gap-1 text-amber-500 font-semibold ml-auto" title="Calificación">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{rating.toFixed(1)}</span>
                {reviewsCount > 0 && (
                  <span className="text-slate-400 font-normal">({reviewsCount})</span>
                )}
              </div>
            )}
          </div>

          {/* Barra de Progreso (si el usuario está cursando la materia) */}
          {hasProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Progreso</span>
                <span className="text-brand font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer de Acción */}
      <div className="p-5 pt-0">
        <Button
          href={finalHref}
          onClick={onAction}
          variant={isEnrolled ? 'brand' : 'secondary'}
          size="md"
          fullWidth
          rightIcon={
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          {finalActionText}
        </Button>
      </div>
    </article>
  );
}

export default CourseCard;
