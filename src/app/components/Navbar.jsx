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
    { label: 'Mis Cursos', href: '/dashboard#my-courses' },
    { label: 'Explorar', href: '/courses' },
    { label: 'Avance', href: '/dashboard#progress' },
    { label: 'Recursos', href: '/dashboard#resources' },
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
        sticky top-0 z-50 w-full border-b border-sky-900/80 bg-[#051426] text-white shadow-[0_8px_30px_rgba(0,0,0,0.15)]
        backdrop-blur-md transition-colors duration-200
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href={maskRoute(isAuthenticated ? '/dashboard' : '/')}
            className="flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
              <svg className="h-6 w-6 fill-current text-white" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM3.45 9L12 4.34 20.55 9 12 13.66 3.45 9zM5 12.06v5.22c0 2.21 3.13 4 7 4s7-1.79 7-4v-5.22l-7 3.82-7-3.82z" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="flex items-center gap-1.5 text-3xl font-black tracking-tight text-white">
                LMS <span className="text-blue-400">UMG</span>
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Plataforma Virtual ({activeRole})
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const isActive = currentPath === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    rounded-xl px-5 py-3 text-base font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-[#122742] text-white shadow-inner shadow-blue-900/40'
                      : 'text-slate-200 hover:bg-[#0d1d33] hover:text-white'}
                  `.trim().replace(/\s+/g, ' ')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Cambiar tema"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-800 bg-[#0c1f34] text-sky-200 transition-colors hover:bg-[#112b45]"
          >
            {mounted ? (isDark ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-sky-200" />) : <span className="h-5 w-5" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-sky-800 bg-[#0c1f34] text-sky-200 transition-colors hover:bg-[#112b45]"
              >
                🔔
                {notificationsCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {notificationsCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-xl border border-sky-800 bg-[#0c1f34] p-1.5 pr-3 transition-colors hover:bg-[#112b45]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 font-bold text-xs text-white">
                    {(user?.name || activeRole).charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="max-w-[100px] truncate text-xs font-bold text-white">
                      {user?.name || `Usuario ${activeRole}`}
                    </span>
                    <span className="text-[10px] capitalize text-slate-300">{activeRole}</span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-sky-800 bg-[#0a1c2f] p-2 shadow-2xl z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-[#112b45] transition-colors"
                    >
                      Cerrar Sesión ({activeRole})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button href={maskRoute('/login')} variant="secondary" size="md" className="!border-sky-800 !bg-[#0c1f34] !text-white hover:!bg-[#112b45]">
                Iniciar Sesión
              </Button>
              <Button href={maskRoute('/register')} variant="brand" size="md" className="!bg-blue-600 !text-white hover:!bg-blue-500">
                Comenzar
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-800 bg-[#0c1f34] text-sky-200 transition-colors hover:bg-[#112b45] md:hidden"
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

      {mobileMenuOpen && (
        <div className="border-t border-sky-900/80 bg-[#051426] px-4 py-3 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1 pb-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0d1d33]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="pt-2 flex flex-col gap-2">
              <Button
                href={maskRoute('/login')}
                variant="secondary"
                size="md"
                fullWidth
                className="!border-sky-800 !bg-[#0c1f34] !text-white hover:!bg-[#112b45]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Iniciar Sesión
              </Button>
              <Button
                href={maskRoute('/register')}
                variant="brand"
                size="md"
                fullWidth
                onClick={() => setMobileMenuOpen(false)}
              >
                Comenzar
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;