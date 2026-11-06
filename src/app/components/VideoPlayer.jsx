"use client";

import React, { useState, useMemo } from 'react';
import Button from './Button';

/**
 * Extrae el ID de un video de YouTube a partir de múltiples formatos de URL:
 * - https://www.youtube.com/watch?v=XXXXX
 * - https://youtu.be/XXXXX
 * - https://www.youtube.com/embed/XXXXX
 * - https://www.youtube.com/shorts/XXXXX
 * 
 * @param {string} url 
 * @returns {string|null} ID de video o null si no es un enlace de YouTube
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;

  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
    /^([\w-]{11})$/, // En caso de que se pase el ID directamente
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Componente VideoPlayer responsive 16:9 para lecciones del LMS UMG.
 * Soporta URLs de YouTube (con modo privado sin cookies) y videos nativos HTML5.
 * 
 * @param {Object} props
 * @param {string} props.url - URL del video (YouTube o archivo .mp4/.webm)
 * @param {string} [props.title] - Título de la lección actual
 * @param {string} [props.moduleName] - Nombre del módulo o curso
 * @param {string} [props.poster] - Imagen de portada antes de reproducir
 * @param {boolean} [props.autoPlay=false] - Iniciar reproducción automática
 * @param {boolean} [props.isCompleted=false] - Indica si la lección ya fue completada
 * @param {Function} [props.onComplete] - Callback al marcar como completada
 * @param {Function} [props.onNext] - Callback para pasar a la siguiente lección
 * @param {Function} [props.onPrev] - Callback para volver a la lección anterior
 * @param {string} [props.className] - Clases adicionales de Tailwind
 */
export function VideoPlayer({
  url,
  title = 'Reproducción de Lección',
  moduleName,
  poster,
  autoPlay = false,
  isCompleted = false,
  onComplete,
  onNext,
  onPrev,
  className = '',
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [completedState, setCompletedState] = useState(isCompleted);

  const youtubeId = useMemo(() => extractYouTubeId(url), [url]);

  // Construir URL de embed seguro de YouTube con privacidad mejorada
  const embedUrl = useMemo(() => {
    if (!youtubeId) return null;
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      enablejsapi: '1',
      autoplay: autoPlay ? '1' : '0',
    });
    return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
  }, [youtubeId, autoPlay]);

  const handleMarkCompleted = () => {
    const nextState = !completedState;
    setCompletedState(nextState);
    if (onComplete) {
      onComplete(nextState);
    }
  };

  return (
    <div
      className={`
        flex flex-col overflow-hidden rounded-2xl
        border border-slate-200 dark:border-slate-800
        bg-surface text-foreground shadow-xl transition-all duration-300
        ${isTheater ? 'w-full max-w-none' : 'w-full'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* BARRA SUPERIOR DEL REPRODUCTOR (TÍTULO Y TEATRO) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-col truncate">
          {moduleName && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
              {moduleName}
            </span>
          )}
          <h2 className="text-sm sm:text-base font-bold text-foreground truncate" title={title}>
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón modo cine / teatro */}
          <button
            type="button"
            onClick={() => setIsTheater(!isTheater)}
            title={isTheater ? 'Vista normal' : 'Vista modo cine'}
            aria-label={isTheater ? 'Vista normal' : 'Vista modo cine'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isTheater ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 0l0-5m0 0l-5 0m5 0l5 5M4 20l5-5m-5 5l0-5m0 5l5 0m11-5l5 5m0 0l-5 0m5 0l0-5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ÁREA DE VIDEO RESPONSIVE 16:9 */}
      <div className="relative aspect-video w-full bg-black overflow-hidden select-none">
        {/* Spinner de carga inicial */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
            <svg
              className="h-10 w-10 animate-spin text-brand"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-xs font-medium tracking-wide text-slate-400">
              Cargando reproductor de clase...
            </span>
          </div>
        )}

        {/* Reproductor YouTube o Video Nativo */}
        {youtubeId && embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : url ? (
          <video
            src={url}
            poster={poster}
            controls
            autoPlay={autoPlay}
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className="absolute inset-0 h-full w-full object-contain"
          >
            Tu navegador no soporta reproducción de video HTML5.
          </video>
        ) : (
          // Estado sin video asignado
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950">
            <svg
              className="h-14 w-14 text-slate-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-semibold text-slate-300">No hay video configurado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Por favor proporciona una URL válida de YouTube o un archivo multimedia compatible.
            </p>
          </div>
        )}

        {/* Estado de Error */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <svg className="h-12 w-12 text-rose-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-bold text-rose-400">Error al cargar el video</p>
            <p className="text-xs text-slate-400 mt-1">Verifica tu conexión a internet o el enlace del video.</p>
          </div>
        )}
      </div>

      {/* BARRA DE NAVEGACIÓN Y COMPLETITUD DE LECCIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-surface px-4 py-3">
        {/* Navegación Anterior / Siguiente */}
        <div className="flex items-center gap-2">
          {onPrev && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onPrev}
              leftIcon={
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Anterior
            </Button>
          )}

          {onNext && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNext}
              rightIcon={
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Siguiente
            </Button>
          )}
        </div>

        {/* Marcar como completada */}
        <Button
          variant={completedState ? 'success' : 'brand'}
          size="sm"
          onClick={handleMarkCompleted}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          {completedState ? 'Lección Completada' : 'Marcar como Completada'}
        </Button>
      </div>
    </div>
  );
}

export default VideoPlayer;
