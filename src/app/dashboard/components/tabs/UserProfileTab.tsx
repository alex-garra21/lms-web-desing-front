'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input } from '@/components';
import { getRoleDisplayName } from '@/utils/roleHelper';
import { formatDateTime } from '../../utils';
import type { UserProfile, StatusFeedback } from '../../types';

export interface UserProfileTabProps {
  currentUser: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onFeedback: (fb: StatusFeedback) => void;
}

export function UserProfileTab({
  currentUser,
  onProfileUpdated,
  onFeedback,
}: UserProfileTabProps) {
  const [nombres, setNombres] = useState(currentUser.nombres || '');
  const [apellidos, setApellidos] = useState(currentUser.apellidos || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(
    currentUser.fecha_nacimiento ? currentUser.fecha_nacimiento.slice(0, 10) : ''
  );
  const [direccion, setDireccion] = useState(currentUser.direccion || '');
  const [telefono, setTelefono] = useState(currentUser.telefono || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const codigoEmpleado = currentUser.codigo_empleado || '';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombres = nombres.trim();
    const cleanApellidos = apellidos.trim();
    const cleanDireccion = direccion.trim();
    const cleanTelefono = telefono.trim();
    const cleanAvatar = avatar.trim();

    if (!cleanNombres || !cleanApellidos || !fechaNacimiento || !cleanDireccion) {
      onFeedback({
        type: 'error',
        message:
          'Nombres, apellidos, fecha de nacimiento y dirección son campos obligatorios.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        nombres: cleanNombres,
        apellidos: cleanApellidos,
        fecha_nacimiento: fechaNacimiento,
        direccion: cleanDireccion,
        telefono: cleanTelefono || null,
        avatar: cleanAvatar || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', currentUser.id)
        .select('*')
        .single();

      if (error) {
        onFeedback({
          type: 'error',
          message: `No se pudieron guardar los cambios en users: ${error.message}`,
        });
        return;
      }

      const updatedProfile = (data || {
        ...currentUser,
        ...updatePayload,
      }) as UserProfile;

      onProfileUpdated(updatedProfile);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms:profile-updated'));
      }
      onFeedback({
        type: 'success',
        message: 'Tus datos personales fueron actualizados correctamente.',
      });
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar tus datos.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = `${nombres || currentUser.nombres} ${
    apellidos || currentUser.apellidos
  }`.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Tarjeta Resumen Institucional */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 lg:col-span-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          Ficha Institucional UMG
        </span>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-black text-white shadow-md shadow-blue-900/20">
            {avatar.trim() ? (
              <img
                src={avatar.trim()}
                alt={fullName}
                className="h-16 w-16 object-cover"
              />
            ) : (
              (fullName || currentUser.rol).charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-foreground">
              {fullName}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {currentUser.correo}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                {getRoleDisplayName(currentUser.rol)}
              </span>
              {currentUser.codigo_empleado && (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                  {currentUser.codigo_empleado}
                </span>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              Correo Institucional
            </dt>
            <dd className="truncate font-semibold text-foreground">
              {currentUser.correo}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              Credencial NFC
            </dt>
            <dd className="font-semibold text-foreground">
              {currentUser.nfc_token_hash ? 'Vinculada' : 'No registrada'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              Última actualización
            </dt>
            <dd className="text-foreground">
              {formatDateTime(currentUser.updated_at)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Formulario de Edición de Datos Personales */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800 lg:col-span-8">
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Editar Datos Personales
          </span>
          <h3 className="mt-3 text-xl font-black text-foreground">
            Actualiza tu información en Campus Cobán
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Los cambios se sincronizan directamente con la tabla{' '}
            <code className="font-mono font-bold">users</code> de Supabase y se
            reflejan de inmediato en tu barra de navegación y panel.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombres"
              value={nombres}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNombres(e.target.value)
              }
              placeholder="Ej. Carlos Enrique"
              required
            />
            <Input
              label="Apellidos"
              value={apellidos}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setApellidos(e.target.value)
              }
              placeholder="Ej. Morales Choc"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFechaNacimiento(e.target.value)
              }
              required
            />
            <Input
              label="Teléfono de Contacto"
              value={telefono}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTelefono(e.target.value)
              }
              placeholder="Ej. +502 5555-0000"
            />
          </div>

          <Input
            label="Dirección de Residencia"
            value={direccion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDireccion(e.target.value)
            }
            placeholder="Ej. Zona 3, Cobán, Alta Verapaz"
            required
          />

          <div className={`grid gap-4 ${codigoEmpleado ? 'sm:grid-cols-2' : ''}`}>
            <Input
              label="URL de Avatar / Foto de Perfil"
              value={avatar}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAvatar(e.target.value)
              }
              placeholder="https://..."
              helperText="Opcional: enlace directo a tu fotografía de perfil"
            />
            {codigoEmpleado ? (
              <Input
                label="Código de Empleado"
                value={codigoEmpleado}
                disabled
                readOnly
                helperText="Código institucional autogenerado por el sistema (solo lectura)"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setNombres(currentUser.nombres || '');
                setApellidos(currentUser.apellidos || '');
                setFechaNacimiento(
                  currentUser.fecha_nacimiento
                    ? currentUser.fecha_nacimiento.slice(0, 10)
                    : ''
                );
                setDireccion(currentUser.direccion || '');
                setTelefono(currentUser.telefono || '');
                setAvatar(currentUser.avatar || '');
              }}
            >
              Restaurar valores
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isSaving}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

// Alias for backwards compatibility
export { UserProfileTab as UserProfileEditModule };
