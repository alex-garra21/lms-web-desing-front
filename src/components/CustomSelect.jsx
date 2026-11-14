"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function CustomSelect({
  options,
  value,
  onChange,
  label = "Ordenar por",
  fullWidth = false,
  className = "",
  buttonClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div
      className={`relative ${fullWidth ? 'w-full' : 'inline-block'} text-left ${className}`}
      ref={dropdownRef}
    >
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-3 px-5 py-2.5 rounded-full bg-[#0A1128] text-white text-sm font-medium shadow-md hover:bg-[#121C3D] transition-all focus:outline-none cursor-pointer ${
          fullWidth ? 'w-full' : ''
        } ${buttonClassName}`}
      >
        {label ? <span className="text-gray-400 font-normal">{label}</span> : null}
        <span className="font-semibold text-slate-900 dark:text-white">
          {selectedOption ? selectedOption.label : ''}
        </span>
        <svg 
          className={`w-4 h-4 ml-1 transition-transform duration-200 text-slate-500 dark:text-slate-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menú desplegable flotante */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-2 ${
            fullWidth ? 'w-full' : 'w-56'
          } origin-top-left rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[999] overflow-hidden py-1.5 dark:bg-[#0c1f34] dark:border dark:border-sky-800`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4.5 py-2.5 text-sm transition-colors flex items-center justify-between ${
                value === option.value 
                  ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/40 dark:text-blue-300' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-200 dark:hover:bg-[#112b45]'
              }`}
            >
              {option.label}
              {value === option.value && (
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
