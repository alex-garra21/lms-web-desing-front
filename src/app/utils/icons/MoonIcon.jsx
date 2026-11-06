"use client";

import React from 'react';

/**
 * MoonIcon - Componente de icono SVG de la Luna para el selector de tema (Modo Claro/Oscuro)
 * Reutilizable y estilizable mediante Tailwind CSS.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Clases de Tailwind para tamaño, color y animación
 */
export function MoonIcon({ className = 'h-5 w-5', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default MoonIcon;
