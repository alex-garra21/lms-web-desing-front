'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import { ShowPasswordIcon, HidePasswordIcon } from '@/utils/icons/showeyes';
import type { UserProfile, StatusFeedback } from '../../types';

export interface UserSecurityTabProps {
  currentUser: UserProfile;
  onFeedback: (fb: StatusFeedback) => void;
}

export function UserSecurityTab({
  currentUser,
  onFeedback,
}: UserSecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Validación reactiva en tiempo real de los 6 criterios
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  const criteria = [
    { label: 'Al menos 8 caracteres', valid: hasMinLength },
    { label: 'Al menos una letra mayúscula', valid: hasUpperCase },
    { label: 'Al menos un símbolo', valid: hasSymbol },
    { label: 'Al menos una letra minúscula', valid: hasLowerCase },
    { label: 'Al menos un número', valid: hasNumber },
    { label: 'Las contraseñas coinciden', valid: passwordsMatch },
  ];

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      onFeedback({
        type: 'error',
        message: 'Por favor ingresa la nueva contraseña.',
      });
      return;
    }

    if (!hasMinLength) {
      onFeedback({
        type: 'error',
        message: 'La nueva contraseña debe contener al menos 8 caracteres.',
      });
      return;
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      onFeedback({
        type: 'error',
        message:
          'La nueva contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      onFeedback({
        type: 'error',
        message: 'Las contraseñas no coinciden. Por favor verifica ambos campos.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Si el usuario ingresa su contraseña actual, validamos credenciales previamente
      if (currentPassword.trim() && currentUser.correo) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.correo,
          password: currentPassword.trim(),
        });

        if (signInError) {
          onFeedback({
            type: 'error',
            message:
              'La contraseña actual ingresada es incorrecta. Por favor verifica tus credenciales.',
          });
          setIsUpdating(false);
          return;
        }
      }

      // Actualizar contraseña mediante Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateError) {
        onFeedback({
          type: 'error',
          message: `Error al actualizar la contraseña: ${updateError.message}`,
        });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      onFeedback({
        type: 'success',
        message:
          '¡Contraseña actualizada exitosamente! Utiliza tu nueva clave para próximos inicios de sesión.',
      });
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar la contraseña.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Tarjeta Informativa de Seguridad */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 lg:col-span-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
          Seguridad Institucional UMG
        </span>

        <h3 className="mt-4 text-lg font-bold text-foreground">
          Protección de Cuenta
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Para garantizar la integridad y seguridad de tu cuenta institucional, tu contraseña debe cumplir con los siguientes criterios:
        </p>

        <div className="mt-6 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/40">
          {criteria.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 transition-colors duration-200 ${
                item.valid
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                  item.valid
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {item.valid ? '✓' : '•'}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p className="font-medium">
            Cuenta vinculada:{' '}
            <span className="font-semibold text-foreground">
              {currentUser.correo}
            </span>
          </p>
        </div>
      </section>

      {/* Formulario de Cambio de Contraseña */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 lg:col-span-8">
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            Actualización de Credenciales
          </span>
          <h2 className="mt-3 text-xl font-black text-foreground">
            Cambiar Contraseña
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ingresa tu nueva clave de acceso institucional para actualizar tu sesión en Supabase Auth.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            label="Contraseña Actual"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCurrentPassword(e.target.value)
            }
            placeholder="••••••••"
            helperText="Opcional: verifica tu identidad si la recuerdas"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
              >
                {showCurrentPassword ? (
                  <HidePasswordIcon className="w-5 h-5" />
                ) : (
                  <ShowPasswordIcon className="w-5 h-5" />
                )}
              </button>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nueva Contraseña"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPassword(e.target.value)
              }
              placeholder="••••••••"
              required
              helperText="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                >
                  {showNewPassword ? (
                    <HidePasswordIcon className="w-5 h-5" />
                  ) : (
                    <ShowPasswordIcon className="w-5 h-5" />
                  )}
                </button>
              }
            />
            <Input
              label="Confirmar Nueva Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="••••••••"
              required
              helperText="Debe coincidir con la nueva contraseña"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                >
                  {showConfirmPassword ? (
                    <HidePasswordIcon className="w-5 h-5" />
                  ) : (
                    <ShowPasswordIcon className="w-5 h-5" />
                  )}
                </button>
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isUpdating}
            >
              Actualizar Contraseña
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

// Alias for backwards compatibility
export { UserSecurityTab as UserSecurityModule };
