"use client";

import React, { forwardRef } from 'react';
import Link from 'next/link';

/**
 * Variantes de estilo alineadas con colors.css y globals.css
 */
const VARIANTS = {
  brand:
    'bg-brand hover:bg-brand-hover text-white shadow-md shadow-blue-600/20 border border-transparent focus-visible:ring-brand',
  secondary:
    'bg-surface text-foreground border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 shadow-sm focus-visible:ring-slate-400',
  outline:
    'bg-transparent border-2 border-brand text-brand hover:bg-brand hover:text-white dark:border-brand dark:text-brand dark:hover:bg-brand dark:hover:text-white focus-visible:ring-brand',
  ghost:
    'bg-transparent text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent focus-visible:ring-slate-400',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border border-transparent focus-visible:ring-rose-500',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 border border-transparent focus-visible:ring-emerald-500',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5 min-h-[32px]',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2 min-h-[42px]',
  lg: 'px-6 py-3.5 text-base font-semibold rounded-xl gap-2.5 min-h-[50px]',
  icon: 'p-2.5 text-sm rounded-xl min-h-[40px] min-w-[40px] justify-center',
};

/**
 * Componente Button reutilizable del LMS UMG.
 * Soporta variantes semánticas, estados de carga, iconos y renderizado polimórfico como Link.
 * @type {React.ForwardRefExoticComponent<any>}
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'brand',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    href,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const isButtonDisabled = disabled || isLoading;
  const variantStyles = VARIANTS[variant] || VARIANTS.brand;
  const sizeStyles = SIZES[size] || SIZES.md;

  const baseStyles =
    'inline-flex items-center justify-center font-sans tracking-wide transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const combinedClasses = `
    ${baseStyles}
    ${variantStyles}
    ${sizeStyles}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Contenido interno con spinner si está cargando
  const content = (
    <>
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      ) : leftIcon ? (
        <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {!isLoading && rightIcon ? (
        <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>
      ) : null}
    </>
  );

  // Si se provee href y no está deshabilitado, renderizar como Next.js Link
  if (href && !isButtonDisabled) {
    return (
      <Link href={href} className={combinedClasses} ref={ref} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={isButtonDisabled}
      aria-disabled={isButtonDisabled}
      className={combinedClasses}
      {...props}
    >
      {content}
    </button>
  );
});

export default Button;
