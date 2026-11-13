"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { maskRoute } from '@/utils/routeHasher';
import { useDarkMode } from '@/hooks/useDarkMode';
import { SunIcon, MoonIcon } from '@/utils/icons';

/**
 * Vista de Registro de Nuevos Estudiantes para el LMS UMG (Campus Cobán).
 * 
 * - Campos requeridos: Nombres, Apellidos, Correo electrónico, Fecha de nacimiento y Código de Registro
 * - Componentes Input y Button con tokens de globals.css
 * - Validación y manejo de estados asíncronos (isLoading, errores)
 * - Protección anti-IDOR con maskRoute() en todas las URLs y redirecciones
 */
function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    registrationCode: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { isDark, toggleDarkMode, mounted } = useDarkMode();

  // Enlaces enmascarados anti-IDOR
  const homeHref = maskRoute('/');
  const loginHref = maskRoute('/login');
  const termsHref = maskRoute('/terms');

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validaciones del formulario
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('Por favor ingresa tus nombres y apellidos completos.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('El correo electrónico es obligatorio.');
      return;
    }

    if (!formData.birthDate) {
      setErrorMessage('La fecha de nacimiento es obligatoria.');
      return;
    }

    if (!formData.registrationCode.trim()) {
      setErrorMessage('El Código de Registro emitido por Secretaría es obligatorio.');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!formData.acceptTerms) {
      setErrorMessage('Debes aceptar las políticas y reglamentos del LMS UMG.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulación de registro asíncrono hacia Supabase
      await new Promise((resolve) => setTimeout(resolve, 900));

      setSuccessMessage(
        '¡Registro completado exitosamente! Tu cuenta ha sido verificada con el código de Secretaría. Redirigiendo al inicio de sesión...'
      );

      const createdUser = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        registrationCode: formData.registrationCode,
        role: 'student',
      };

      if (onRegisterSuccess) {
        onRegisterSuccess(createdUser);
      } else if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = loginHref;
        }, 1200);
      }
    } catch {
      setErrorMessage('Error al procesar el registro con el servidor institucional.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-200">
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

      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* LOGO Y ENCABEZADO */}
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
                Inscripciones y Registro
              </span>
            </div>
          </Link>

          <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Crear Cuenta de Estudiante
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Ingresa tus datos personales y el Código de Registro emitido por la Secretaría Académica del campus
          </p>
        </div>

        {/* TARJETA DEL FORMULARIO */}
        <div className="mt-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/20">
          {/* Mensajes de estado */}
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NOMBRES Y APELLIDOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombres"
                id="reg-first-name"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Carlos Eduardo"
                required
              />

              <Input
                label="Apellidos"
                id="reg-last-name"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="López Mendoza"
                required
              />
            </div>

            {/* CORREO ELECTRÓNICO */}
            <Input
              label="Correo Electrónico"
              type="email"
              id="reg-email"
              name="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="estudiante@miumg.edu.gt"
              helperText="Preferentemente tu correo institucional UMG o personal"
              required
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            {/* FECHA DE NACIMIENTO Y CÓDIGO DE REGISTRO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de Nacimiento"
                type="date"
                id="reg-birth-date"
                name="birthDate"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                required
              />

              <Input
                label="Código de Registro UMG"
                id="reg-code"
                name="registrationCode"
                value={formData.registrationCode}
                onChange={(e) => handleChange('registrationCode', e.target.value.toUpperCase())}
                placeholder="UMG-COBAN-2026-X9K"
                helperText="Emitido por Secretaría Académica"
                required
                leftIcon={
                  <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
            </div>

            {/* CONTRASEÑA Y CONFIRMACIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type="password"
                id="reg-password"
                name="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                helperText="Mínimo 8 caracteres"
                required
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                id="reg-confirm-password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {/* TÉRMINOS Y CONDICIONES */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand focus:ring-offset-0"
                  required
                />
                <span>
                  Declaro que la información proporcionada es verídica y acepto el{' '}
                  <Link href={termsHref} className="text-brand hover:underline">
                    Reglamento Estudiantil
                  </Link>{' '}
                  y las políticas de uso de la plataforma LMS UMG.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-3"
            >
              Completar Registro
            </Button>
          </form>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-6 text-center space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p>
            ¿Ya cuentas con usuario y contraseña?{' '}
            <Link
              href={loginHref}
              className="font-bold text-brand hover:underline focus:outline-none"
            >
              Iniciar Sesión
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

export default function RegisterPage() {
  return <RegisterForm />;
}
