"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { maskRoute } from '@/app/utils/routeHasher';
import { useDarkMode } from '@/app/hooks/useDarkMode';
import { SunIcon, MoonIcon } from '@/app/utils/icons';

/**
 * Vista de Inicio de Sesión (Login) para el LMS UMG.
 * Cumple estrictamente con AGENTS.md:
 * - Estilizado con Tailwind CSS y tokens de globals.css (--background, --foreground, --surface, --brand)
 * - Componentes Input y Button desacoplados y reutilizables
 * - Soporte nativo para modo claro y oscuro
 * - Rutas y redirecciones protegidas con maskRoute() anti-IDOR
 * 
 * @param {Object} props
 * @param {Function} [props.onLoginSuccess] - Callback opcional al autenticar exitosamente
 * @param {string} [props.redirectPath] - Ruta de redirección post-login
 */
export function Login({ onLoginSuccess, redirectPath = '/dashboard' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { isDark, toggleDarkMode, mounted } = useDarkMode();

  // Enlaces ofuscados anti-IDOR
  const homeHref = maskRoute('/');
  const registerHref = maskRoute('/register');
  const forgotPasswordHref = maskRoute('/forgot-password');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo institucional y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulación de autenticación (integrable con Supabase Auth)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockUser = {
        name: email.split('@')[0].replace('.', ' '),
        email,
        role: email.includes('admin')
          ? 'admin'
          : email.includes('catedra') || email.includes('docente')
          ? 'instructor'
          : email.includes('sec')
          ? 'secretary'
          : 'student',
      };

      setSuccessMessage('¡Autenticación exitosa! Redirigiendo a tu panel...');

      if (onLoginSuccess) {
        onLoginSuccess(mockUser);
      } else if (typeof window !== 'undefined') {
        const targetUrl = maskRoute(redirectPath);
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 600);
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor de autenticación de Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  // Selector de credenciales de demostración rápida para pruebas locales
  const handleQuickRoleLogin = (roleName, demoEmail) => {
    setEmail(demoEmail);
    setPassword('DemoPass2026!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-200">
      {/* Botón flotante para alternar tema */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
        >
          {mounted ? (
            isDark ? (
              <SunIcon className="h-5 w-5 text-amber-500 hover:rotate-45 transition-transform" />
            ) : (
              <MoonIcon className="h-5 w-5 text-slate-700 dark:text-slate-300 hover:-rotate-12 transition-transform" />
            )
          ) : (
            <span className="h-5 w-5 opacity-0" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* LOGO INSTITUCIONAL */}
        <div className="flex flex-col items-center text-center">
          <Link
            href={homeHref}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-blue-600/30 transition-transform group-hover:scale-105">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM3.45 9L12 4.34 20.55 9 12 13.66 3.45 9zM5 12.06v5.22c0 2.21 3.13 4 7 4s7-1.79 7-4v-5.22l-7 3.82-7-3.82z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-1">
                LMS <span className="text-brand">UMG</span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Campus Cobán
              </span>
            </div>
          </Link>

          <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Ingresa con tu cuenta institucional para acceder a tus cursos y asignaciones
          </p>
        </div>

        {/* TARJETA DEL FORMULARIO */}
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/20">
          {/* Alertas de error o éxito */}
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico Institucional"
              type="email"
              id="login-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.usuario@miumg.edu.gt"
              required
              helperText="Dominio oficial UMG (@miumg.edu.gt)"
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            <Input
              label="Contraseña"
              type="password"
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand focus:ring-offset-0"
                />
                <span>Recordar sesión</span>
              </label>

              <Link
                href={forgotPasswordHref}
                className="font-semibold text-brand hover:underline focus:outline-none"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Accesos rápidos de prueba de roles */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 text-center">
              Acceso Rápido de Prueba (Demo Roles)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRoleLogin('Estudiante', 'estudiante@miumg.edu.gt')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                👨‍🎓 Estudiante
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleLogin('Docente', 'docente@miumg.edu.gt')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                👨‍🏫 Catedrático
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleLogin('Secretaría', 'secretaria@miumg.edu.gt')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                🏛️ Secretaría
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleLogin('Admin', 'admin@miumg.edu.gt')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                🛡️ Administrador
              </button>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA DE ENLACES */}
        <div className="mt-6 text-center space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p>
            ¿Aún no tienes una cuenta académica?{' '}
            <Link
              href={registerHref}
              className="font-bold text-brand hover:underline focus:outline-none"
            >
              Regístrate aquí
            </Link>
          </p>

          <p>
            <Link
              href={homeHref}
              className="text-slate-500 hover:text-foreground hover:underline transition-colors"
            >
              ← Volver al portal principal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
