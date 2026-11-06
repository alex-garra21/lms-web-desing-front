"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from './Button';
import { useDarkMode } from '../hooks/useDarkMode';
import { maskRoute } from '@/app/utils/routeHasher';
import { SunIcon, MoonIcon } from '@/app/utils/icons';

/**
 * Enlaces y módulos para los 5 roles del LMS UMG (con IDs de ejemplo para probar maskRoute)
 */
export const ROLE_NAV_LINKS = {
  public: [
    { label: 'Inicio', href: '/' },
    { label: 'Catálogo de Cursos', href: '/courses' },
    { label: 'Docentes', href: '/faculty' },
    { label: 'Acerca de UMG', href: '/about' },
  ],
  student: [
    { label: 'Mi Panel', href: '/dashboard' },
    { label: 'Mis Cursos', href: '/my-courses/101' },
    { label: 'Explorar', href: '/courses' },
    { label: 'Calificaciones', href: '/grades/student/101' },
    { label: 'Recursos', href: '/resources' },
  ],
  instructor: [
    { label: 'Panel Docente', href: '/instructor/dashboard' },
    { label: 'Mis Clases', href: '/instructor/classes/202' },
    { label: 'Calificar', href: '/instructor/grading/202' },
    { label: 'Materiales', href: '/instructor/resources' },
  ],
  secretary: [
    { label: 'Secretaría', href: '/secretariat/dashboard' },
    { label: 'Inscripciones', href: '/secretariat/enrollments/303' },
    { label: 'Constancias', href: '/secretariat/certificates' },
    { label: 'Pagos', href: '/secretariat/payments' },
  ],
  admin: [
    { label: 'Panel Admin', href: '/admin/dashboard' },
    { label: 'Usuarios', href: '/admin/users/404' },
    { label: 'Asignaciones', href: '/admin/assignments' },
    { label: 'Auditoría', href: '/admin/security' },
  ],
};

/**
 * @param {Object} props
 * @param {any} [props.user]
 * @param {string} [props.role]
 * @param {Function} [props.onLogout]
 * @param {string} [props.currentPath]
 * @param {number} [props.notificationsCount]
 * @param {string} [props.className]
 */
export function Navbar({
  user = null,
  role = 'public',
  onLogout,
  currentPath = '/',
  notificationsCount = 0,
  className = '',
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { isDark, toggleDarkMode, mounted } = useDarkMode();

  const activeRole = user?.role || (user ? 'student' : role);
  const rawLinks = ROLE_NAV_LINKS[activeRole] || ROLE_NAV_LINKS.public;

  // Enmascaramiento obligatorio de rutas para prevenir IDOR
  const navLinks = rawLinks.map(link => ({
    ...link,
    href: maskRoute(link.href)
  }));

  const isAuthenticated = activeRole !== 'public';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full
        border-b border-slate-200 dark:border-slate-800
        bg-surface/90 dark:bg-surface/90 backdrop-blur-md
        transition-colors duration-200
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LOGO INSTITUCIONAL LMS UMG */}
        <div className="flex items-center gap-8">
          <Link
            href={maskRoute(isAuthenticated ? '/dashboard' : '/')}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-blue-600/30 transition-transform group-hover:scale-105">
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM3.45 9L12 4.34 20.55 9 12 13.66 3.45 9zM5 12.06v5.22c0 2.21 3.13 4 7 4s7-1.79 7-4v-5.22l-7 3.82-7-3.82z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                LMS <span className="text-brand">UMG</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Plataforma Virtual ({activeRole})
              </span>
            </div>
          </Link>

          {/* NAVEGACIÓN DESKTOP */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = currentPath === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-150
                    ${isActive
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ACCIONES DE LA DERECHA */}
        <div className="flex items-center gap-3">
          {/* Botón de Modo Oscuro con Iconos Modulares */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Cambiar tema"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            {mounted ? (isDark ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />) : <span className="h-5 w-5" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                🔔
                {notificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {notificationsCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
                    {(user?.name || activeRole).charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground truncate max-w-[100px]">
                      {user?.name || `Usuario ${activeRole}`}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      {activeRole}
                    </span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-2 shadow-2xl z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      Cerrar Sesión ({activeRole})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button href={maskRoute("/login")} variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
              <Button href={maskRoute("/register")} variant="brand" size="sm">
                Comenzar
              </Button>
            </div>
          )}

          {/* Botón hamburguesa móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-surface px-4 py-3 shadow-lg space-y-2">
          <nav className="flex flex-col gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="pt-2 flex flex-col gap-2">
              <Button
                href={maskRoute("/login")}
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setMobileMenuOpen(false)}
              >
                Iniciar Sesión
              </Button>
              <Button
                href={maskRoute("/register")}
                variant="brand"
                size="md"
                fullWidth
                onClick={() => setMobileMenuOpen(false)}
              >
                Comenzar Registro
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;