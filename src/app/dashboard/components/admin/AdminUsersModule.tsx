'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, Select } from '@/components';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { getRoleDisplayName } from '@/utils/roleHelper';
import { createEphemeralAuthClient, recordAuditLog } from '../../utils';
import type { UserProfile, StatusFeedback, UserRole } from '../../types';

export interface AdminUsersModuleProps {
  currentUser: UserProfile;
  users: UserProfile[];
  focusedUserId: string | null;
  onReloadUsers: () => Promise<void> | void;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function AdminUsersModule({
  currentUser,
  users,
  focusedUserId,
  onReloadUsers,
  onFeedback,
}: AdminUsersModuleProps) {
  const initialFocusedUser = focusedUserId
    ? users.find((item) => item.id === focusedUserId) || null
    : null;

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(
    () => initialFocusedUser?.id || null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [formState, setFormState] = useState(() => ({
    authId: initialFocusedUser?.id || '',
    nombres: initialFocusedUser?.nombres || '',
    apellidos: initialFocusedUser?.apellidos || '',
    correo: initialFocusedUser?.correo || '',
    password: '',
    fecha_nacimiento: initialFocusedUser?.fecha_nacimiento
      ? initialFocusedUser.fecha_nacimiento.slice(0, 10)
      : '2000-01-01',
    direccion: initialFocusedUser?.direccion || 'Campus Cobán, Alta Verapaz',
    telefono: initialFocusedUser?.telefono || '',
    rol: (initialFocusedUser?.rol || 'student') as UserRole,
    codigo_empleado: initialFocusedUser?.codigo_empleado || '',
    nfc_token_hash: initialFocusedUser?.nfc_token_hash || '',
  }));

  const startEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormState({
      authId: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      password: '',
      fecha_nacimiento: user.fecha_nacimiento ? user.fecha_nacimiento.slice(0, 10) : '2000-01-01',
      direccion: user.direccion || '',
      telefono: user.telefono || '',
      rol: user.rol,
      codigo_empleado: user.codigo_empleado || '',
      nfc_token_hash: user.nfc_token_hash || '',
    });
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormState({
      authId: '',
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      fecha_nacimiento: '2000-01-01',
      direccion: 'Campus Cobán, Alta Verapaz',
      telefono: '',
      rol: 'student',
      codigo_empleado: '',
      nfc_token_hash: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.nombres.trim() || !formState.apellidos.trim() || !formState.correo.trim()) {
      onFeedback({
        type: 'error',
        message: 'Completa nombres, apellidos y correo institucional del usuario.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingUserId) {
        const previousUser = users.find((u) => u.id === editingUserId) || null;
        const payload = {
          nombres: formState.nombres.trim(),
          apellidos: formState.apellidos.trim(),
          correo: formState.correo.trim(),
          fecha_nacimiento: formState.fecha_nacimiento,
          direccion: formState.direccion.trim() || 'Campus Cobán',
          telefono: formState.telefono.trim() || null,
          rol: formState.rol,
          codigo_empleado: formState.codigo_empleado.trim() || null,
          nfc_token_hash: formState.nfc_token_hash.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingUserId);

        if (error) throw new Error(error.message);

        await recordAuditLog({
          tabla_afectada: 'users',
          registro_id: editingUserId,
          operacion: 'UPDATE',
          usuario_id: currentUser.id,
          datos_anteriores: previousUser as unknown as Record<string, unknown>,
          datos_nuevos: payload,
        });

        onFeedback({
          type: 'success',
          message: `Perfil de ${payload.nombres} ${payload.apellidos} actualizado correctamente.`,
        });
        resetForm();
        await onReloadUsers();
      } else {
        let targetUserId = formState.authId.trim();

        if (!targetUserId) {
          if (!formState.password || formState.password.length < 6) {
            onFeedback({
              type: 'error',
              message:
                'Para registrar un usuario nuevo ingresa una contraseña (mínimo 6 caracteres) o un UUID existente de Supabase Auth.',
            });
            setIsSaving(false);
            return;
          }

          const ephemeralClient = createEphemeralAuthClient();
          const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
            email: formState.correo.trim(),
            password: formState.password,
            options: {
              data: {
                nombres: formState.nombres.trim(),
                apellidos: formState.apellidos.trim(),
                rol: formState.rol,
              },
            },
          });

          if (signUpError || !signUpData.user) {
            throw new Error(
              signUpError?.message ||
                'No se pudo crear la cuenta en Supabase Auth.'
            );
          }

          targetUserId = signUpData.user.id;
        }

        const insertPayload = {
          id: targetUserId,
          nombres: formState.nombres.trim(),
          apellidos: formState.apellidos.trim(),
          correo: formState.correo.trim(),
          fecha_nacimiento: formState.fecha_nacimiento,
          direccion: formState.direccion.trim() || 'Campus Cobán',
          telefono: formState.telefono.trim() || null,
          rol: formState.rol,
          codigo_empleado: formState.codigo_empleado.trim() || null,
          nfc_token_hash: formState.nfc_token_hash.trim() || null,
        };

        const { data: createdRow, error: insertError } = await supabase
          .from('users')
          .upsert([insertPayload], { onConflict: 'id' })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

        await recordAuditLog({
          tabla_afectada: 'users',
          registro_id: targetUserId,
          operacion: 'INSERT',
          usuario_id: currentUser.id,
          datos_nuevos: (createdRow || insertPayload) as Record<string, unknown>,
        });

        onFeedback({
          type: 'success',
          message: `Usuario ${insertPayload.nombres} ${insertPayload.apellidos} creado correctamente.`,
        });
        resetForm();
        await onReloadUsers();
      }
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el usuario.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.id === currentUser.id) {
      onFeedback({
        type: 'error',
        message: 'No puedes desactivar tu propia sesión activa.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', targetUser.id);

      if (error) throw new Error(error.message);

      await recordAuditLog({
        tabla_afectada: 'users',
        registro_id: targetUser.id,
        operacion: 'SOFT_DELETE',
        usuario_id: currentUser.id,
        datos_anteriores: targetUser as unknown as Record<string, unknown>,
        datos_nuevos: updates,
      });

      onFeedback({
        type: 'success',
        message: `Usuario ${targetUser.nombres} ${targetUser.apellidos} marcado con borrado lógico.`,
      });
      await onReloadUsers();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo realizar el borrado lógico.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.rol === roleFilter;
      const matchesText =
        !query ||
        `${user.nombres} ${user.apellidos}`.toLowerCase().includes(query) ||
        user.correo.toLowerCase().includes(query) ||
        (user.codigo_empleado || '').toLowerCase().includes(query);
      return matchesRole && matchesText;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="grid gap-8 xl:grid-cols-[400px_minmax(0,1fr)]">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {editingUserId ? 'Editar registro' : 'Nuevo registro'}
            </p>
            <h2 className="mt-1 text-xl font-black text-foreground">
              {editingUserId ? 'Actualizar usuario' : 'Crear colaborador o estudiante'}
            </h2>
          </div>
          {editingUserId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nombres"
              value={formState.nombres}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, nombres: e.target.value }))
              }
              placeholder="María José"
              required
            />
            <Input
              label="Apellidos"
              value={formState.apellidos}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, apellidos: e.target.value }))
              }
              placeholder="García López"
              required
            />
          </div>

          <Input
            label="Correo Institucional"
            type="email"
            value={formState.correo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormState((prev) => ({ ...prev, correo: e.target.value }))
            }
            placeholder="usuario@miumg.edu.gt"
            required
          />

          {!editingUserId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Contraseña inicial"
                type="password"
                value={formState.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Mín. 6 caracteres"
                helperText="Crea la cuenta en Supabase Auth"
              />
              <Input
                label="UUID Auth (Opcional)"
                value={formState.authId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, authId: e.target.value }))
                }
                placeholder="Si ya existe en auth.users"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Rol institucional"
              value={formState.rol}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormState((prev) => ({
                  ...prev,
                  rol: e.target.value as UserRole,
                }))
              }
              options={[
                { value: 'student', label: 'Estudiante (student)' },
                { value: 'instructor', label: 'Catedrático (instructor)' },
                { value: 'administration', label: 'Administración (administration)' },
                ...(currentUser.rol === 'system'
                  ? [{ value: 'system', label: 'Sistemas (system)' }]
                  : []),
              ]}
              required
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={formState.fecha_nacimiento}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({
                  ...prev,
                  fecha_nacimiento: e.target.value,
                }))
              }
              required
            />
          </div>

          <Input
            label="Dirección / Especialidad"
            value={formState.direccion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormState((prev) => ({ ...prev, direccion: e.target.value }))
            }
            placeholder="Cobán, Alta Verapaz"
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Teléfono"
              value={formState.telefono}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, telefono: e.target.value }))
              }
              placeholder="5555-1234"
            />
            <Input
              label="Código de Empleado"
              value={formState.codigo_empleado}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({
                  ...prev,
                  codigo_empleado: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Auto (EMP-DDMMYYYY-XXX)"
              helperText="Opcional: trigger BD lo genera para docente/admin"
            />
          </div>

          <Input
            label="Hash Token NFC (Opcional)"
            value={formState.nfc_token_hash}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormState((prev) => ({
                ...prev,
                nfc_token_hash: e.target.value,
              }))
            }
            placeholder="NFC-UMG-..."
          />

          <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
            {editingUserId ? 'Guardar Cambios' : 'Registrar Usuario'}
          </Button>
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Directorio institucional
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Colaboradores y estudiantes ({filteredUsers.length})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Buscar por nombre, correo o código"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
            />
            <Select
              value={roleFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setRoleFilter(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todos los roles' },
                { value: 'student', label: 'Estudiante (student)' },
                { value: 'instructor', label: 'Catedrático (instructor)' },
                { value: 'administration', label: 'Administración (administration)' },
                { value: 'system', label: 'Sistemas (system)' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Código Empleado</th>
                <th className="px-4 py-3">NFC</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No se encontraron usuarios activos con los criterios actuales.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userDetailHref = maskRoute(
                    `/dashboard?tab=users&user=${encodeId(user.id)}`
                  );
                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {user.nombres} {user.apellidos}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {user.correo}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          {getRoleDisplayName(user.rol)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {user.codigo_empleado || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {user.nfc_token_hash ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Vinculado
                          </span>
                        ) : (
                          <span className="text-slate-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            href={userDetailHref}
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditUser(user)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={user.id === currentUser.id || isSaving}
                            onClick={() => handleSoftDeleteUser(user)}
                          >
                            Desactivar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
