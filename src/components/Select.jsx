"use client";

import React, { forwardRef, useId } from 'react';

/**
 * Componente Select reutilizable y accesible para el LMS UMG.
 * Soporta opciones dinámicas mediante array o hijos nativos (<option>),
 * estilos de Dark Mode y validación de errores.
 * @type {React.ForwardRefExoticComponent<any>}
 */
export const Select = forwardRef(function Select(
  {
    label,
    id,
    name,
    options = [],
    placeholder,
    error,
    helperText,
    leftIcon,
    required = false,
    disabled = false,
    fullWidth = true,
    className = '',
    selectClassName = '',
    children,
    value,
    defaultValue,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          name={name}
          disabled={disabled}
          required={required}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`
            w-full appearance-none rounded-xl border bg-surface text-foreground
            transition-all duration-200 text-sm outline-none font-sans cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/50
            ${leftIcon ? 'pl-10' : 'pl-3.5'}
            pr-10 py-2.5 min-h-[42px]
            ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900 dark:text-rose-100'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/20'
            }
            ${selectClassName}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400 dark:text-slate-500">
              {placeholder}
            </option>
          )}

          {options.length > 0
            ? options.map((opt) => {
                if (typeof opt === 'string' || typeof opt === 'number') {
                  return (
                    <option key={opt} value={opt} className="bg-surface text-foreground">
                      {opt}
                    </option>
                  );
                }
                return (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-surface text-foreground"
                  >
                    {opt.label || opt.value}
                  </option>
                );
              })
            : children}
        </select>

        {/* Flecha select personalizada */}
        <div className="absolute right-3.5 pointer-events-none flex items-center text-slate-400 dark:text-slate-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
