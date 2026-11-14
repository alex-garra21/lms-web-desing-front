"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { maskRoute } from '@/utils/routeHasher';
import { SunIcon, MoonIcon } from '@/utils/icons';
import { supabase } from '@/utils/supabaseClient';
import { getRoleDisplayName } from '@/utils/roleHelper';

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
    { label: 'Catálogo de Cursos', href: '/courses' },
    { label: 'Mis Cursos', href: '/dashboard?tab=my-courses' },
    { label: 'Tareas y Exámenes', href: '/dashboard?tab=tasks-exams' },
    { label: 'Reseñas', href: '/dashboard?tab=reviews' },
  ],
  instructor: [
    { label: 'Mi Panel', href: '/dashboard' },
    { label: 'Mis Cursos Asignados', href: '/dashboard?tab=courses' },
    { label: 'Tareas y Evaluaciones', href: '/dashboard?tab=evaluations' },
  ],
  system: [
    { label: 'Panel de Administración', href: '/dashboard' },
    { label: 'Gestión de Usuarios', href: '/dashboard?tab=users' },
    { label: 'Códigos de Registro', href: '/dashboard?tab=codes' },
    { label: 'Auditoría General', href: '/dashboard?tab=audit' },
  ],
  administration: [
    { label: 'Panel de Administración', href: '/dashboard' },
    { label: 'Gestión de Usuarios', href: '/dashboard?tab=users' },
    { label: 'Códigos de Registro', href: '/dashboard?tab=codes' },
    { label: 'Supervisión de Cursos', href: '/courses' },
  ],
  secretary: [
    { label: 'Panel de Administración', href: '/dashboard' },
    { label: 'Gestión de Usuarios', href: '/dashboard?tab=users' },
    { label: 'Códigos de Registro', href: '/dashboard?tab=codes' },
    { label: 'Supervisión de Cursos', href: '/courses' },
  ],
  admin: [
    { label: 'Panel de Administración', href: '/dashboard' },
    { label: 'Gestión de Usuarios', href: '/dashboard?tab=users' },
    { label: 'Códigos de Registro', href: '/dashboard?tab=codes' },
    { label: 'Auditoría General', href: '/dashboard?tab=audit' },
  ],
};

const VALID_DB_ROLES = ['system', 'administration', 'instructor', 'student'];
const LEGACY_ROLE_ALIASES = { admin: 'system', secretary: 'administration' };

function normalizeRole(value) {
  if (!value) return null;
  const mapped = LEGACY_ROLE_ALIASES[value] || value;
  return VALID_DB_ROLES.includes(mapped) ? mapped : null;
}

function notifyDashboardUrlChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('lms:urlchange'));
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * @param {Object} props
 * @param {any} [props.user]
 * @param {string} [props.role]
 * @param {Function} [props.onLogout]
 * @param {Function} [props.onTabChange]
 * @param {string} [props.currentPath]
 * @param {number} [props.notificationsCount]
 * @param {string} [props.className]
 */
export function Navbar({
  user = null,
  role = 'public',
  onLogout,
  onTabChange,
  currentPath = '/',
  notificationsCount = 0,
  className = '',
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { isDark, toggleDarkMode, mounted } = useDarkMode();

  const [profile, setProfile] = useState(null);
  const [hasSession, setHasSession] = useState(false);

  const navigateToProfile = (e) => {
    if (e) {
      e.preventDefault();
    }
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);

    if (onTabChange) {
      onTabChange('profile');
      return;
    }

    const targetUrl = maskRoute('/dashboard?tab=profile');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
      window.dispatchEvent(new Event('lms:urlchange'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    router.push(targetUrl);
  };

  const navigateToSecurity = (e) => {
    if (e) {
      e.preventDefault();
    }
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);

    if (onTabChange) {
      onTabChange('security');
      return;
    }

    const targetUrl = maskRoute('/dashboard?tab=security');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
      window.dispatchEvent(new Event('lms:urlchange'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    router.push(targetUrl);
  };

  const handleLinkClick = (e, rawHref) => {
    if (rawHref.startsWith('/dashboard')) {
      const url = new URL(rawHref, 'http://localhost');
      const tab = url.searchParams.get('tab') || 'overview';
      if (onTabChange) {
        e.preventDefault();
        onTabChange(tab);
        setMobileMenuOpen(false);
        return;
      }
    }
    notifyDashboardUrlChange();
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async (session) => {
      if (!session?.user?.id) {
        if (active) {
          setHasSession(false);
          setProfile(null);
        }
        return;
      }
      if (active) setHasSession(true);
      const { data, error } = await supabase
        .from('users')
        .select('nombres, apellidos, avatar, rol')
        .eq('id', session.user.id)
        .eq('is_deleted', false)
        .maybeSingle();
      if (error) {
        console.warn('Navbar: no se pudo leer el perfil en users:', error.message);
      }
      if (data) {
        if (active) setProfile(data);
        return;
      }
      const meta = session.user.user_metadata || {};
      const metaRole = normalizeRole(meta.rol || meta.role);
      const fallbackNombres =
        meta.nombres || meta.full_name || session.user.email?.split('@')[0] || '';
      const fallbackApellidos = meta.apellidos || '';
      if (active) {
        setProfile(
          fallbackNombres || metaRole
            ? {
                nombres: fallbackNombres,
                apellidos: fallbackApellidos,
                avatar: meta.avatar || meta.avatar_url || null,
                rol: metaRole,
              }
            : null
        );
      }
    };

    const refreshCurrentSession = () => {
      supabase.auth.getSession().then(({ data }) => loadProfile(data?.session));
    };

    refreshCurrentSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Se difiere para no invocar Supabase dentro del propio callback de auth
      setTimeout(() => loadProfile(session), 0);
    });

    window.addEventListener('lms:profile-updated', refreshCurrentSession);

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener('lms:profile-updated', refreshCurrentSession);
    };
  }, []);

  const displayName = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user?.name;
  // El rol real proviene de users.rol; las props solo sirven de respaldo mientras carga.
  const resolvedRole =
    normalizeRole(profile?.rol) || normalizeRole(user?.role) || normalizeRole(role);
  const isAuthenticated = hasSession || Boolean(resolvedRole);
  const activeRole = resolvedRole || (isAuthenticated ? 'unknown' : 'public');
  const rawLinks = isAuthenticated
    ? ROLE_NAV_LINKS[resolvedRole] || [{ label: 'Mi Panel', href: '/dashboard' }]
    : ROLE_NAV_LINKS.public;

  // Enmascaramiento obligatorio de rutas para prevenir IDOR
  const navLinks = rawLinks.map(link => ({
    ...link,
    rawHref: link.href,
    href: maskRoute(link.href)
  }));

  const avatarUrl = profile?.avatar || user?.avatar || null;

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await supabase.auth.signOut();
    setProfile(null);
    setHasSession(false);
    if (onLogout) onLogout();
    else if (typeof window !== 'undefined') window.location.href = maskRoute('/login');
  };

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
            onClick={(e) => {
              if (isAuthenticated) {
                handleLinkClick(e, '/dashboard');
              } else {
                notifyDashboardUrlChange();
              }
            }}
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
                Plataforma Virtual
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const isActive = currentPath === link.href.split('#')[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.rawHref)}
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
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  aria-label="Abrir menú de usuario"
                  className="flex items-center gap-2.5 rounded-xl border border-sky-800 bg-[#0c1f34] p-1.5 pr-3 transition-colors hover:bg-[#112b45]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 font-bold text-xs text-white">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || getRoleDisplayName(activeRole)} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      (displayName || getRoleDisplayName(activeRole)).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="max-w-[100px] truncate text-xs font-bold text-white">
                      {displayName || getRoleDisplayName(activeRole)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-300">
                      {getRoleDisplayName(activeRole)}
                    </span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-sky-800 bg-[#0a1c2f] p-2 shadow-2xl z-50">
                    <Link
                      href={maskRoute('/dashboard?tab=profile')}
                      onClick={navigateToProfile}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#112b45] transition-colors"
                    >
                      Editar Datos
                    </Link>
                    <Link
                      href={maskRoute('/dashboard?tab=security')}
                      onClick={navigateToSecurity}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#112b45] transition-colors"
                    >
                      Cambiar Contraseña
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-[#112b45] transition-colors"
                    >
                      Cerrar Sesión
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
                Crear Cuenta
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
                onClick={(e) => handleLinkClick(e, link.rawHref)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0d1d33]"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <Link
                  href={maskRoute('/dashboard?tab=profile')}
                  onClick={navigateToProfile}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0d1d33]"
                >
                  Editar Datos
                </Link>
                <Link
                  href={maskRoute('/dashboard?tab=security')}
                  onClick={navigateToSecurity}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0d1d33]"
                >
                  Cambiar Contraseña
                </Link>
              </>
            )}
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
          {isAuthenticated && onLogout && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="mt-2 w-full rounded-xl border border-rose-500/30 px-3 py-2 text-left text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
