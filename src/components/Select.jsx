"use client";

import React, { forwardRef, useId } from 'react';
import CustomSelect from './CustomSelect';

/**
 * Componente Select reutilizable y accesible para el LMS UMG.
 * Delega el renderizado al componente unificado <CustomSelect> cumpliendo con directrices.md.
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
    required = false,
    fullWidth = true,
    className = '',
    selectClassName = '',
    value,
    defaultValue,
    onChange,
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  const normalizedOptions = [
    ...(placeholder ? [{ value: '', label: placeholder }] : []),
    ...options.map((opt) =>
      typeof opt === 'string' || typeof opt === 'number'
        ? { value: String(opt), label: String(opt) }
        : { value: opt.value, label: opt.label || String(opt.value) }
    ),
  ];

  const handleSelectChange = (selectedValue) => {
    if (!onChange) return;
    onChange({
      target: { value: selectedValue, name, id: selectId },
      currentTarget: { value: selectedValue, name, id: selectId },
    });
  };

  return (
    <div ref={ref} className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
      )}

      <CustomSelect
        label=""
        options={normalizedOptions}
        value={value !== undefined ? value : defaultValue}
        onChange={handleSelectChange}
        fullWidth={fullWidth}
        buttonClassName={`!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm ${selectClassName}`}
      />

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
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
