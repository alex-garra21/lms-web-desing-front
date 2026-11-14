'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, CustomSelect } from '@/components';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { getRoleDisplayName, ROLE_MAPPING, normalizeUserRole } from '@/utils/roleHelper';
import { recordAuditLog } from '../../utils';
import { createAdminUserAction } from '../../actions/createAdminUserAction';
import { updateAdminUserAction } from '../../actions/updateUser';
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formState, setFormState] = useState(() => ({
    nombres: initialFocusedUser?.nombres || '',
    apellidos: initialFocusedUser?.apellidos || '',
    correo: initialFocusedUser?.correo || '',
    password: '',
    fecha_nacimiento: initialFocusedUser?.fecha_nacimiento
      ? initialFocusedUser.fecha_nacimiento.slice(0, 10)
      : '',
    direccion: initialFocusedUser?.direccion || '',
    telefono: initialFocusedUser?.telefono || '',
    rol: (initialFocusedUser?.rol || 'student') as UserRole,
    nfc_token_hash: initialFocusedUser?.nfc_token_hash || '',
  }));

  const startEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormState({
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      password: '',
      fecha_nacimiento: user.fecha_nacimiento ? user.fecha_nacimiento.slice(0, 10) : '',
      direccion: user.direccion || '',
      telefono: user.telefono || '',
      rol: user.rol,
      nfc_token_hash: user.nfc_token_hash || '',
    });
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormState({
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      fecha_nacimiento: '',
      direccion: '',
      telefono: '',
      rol: 'student',
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
        const normalizedRole = normalizeUserRole(formState.rol);

        const res = await updateAdminUserAction({
          userId: editingUserId,
          nombres: formState.nombres.trim(),
          apellidos: formState.apellidos.trim(),
          correo: formState.correo.trim(),
          rol: normalizedRole,
          fecha_nacimiento: formState.fecha_nacimiento || '2000-01-01',
          direccion: formState.direccion.trim() || 'Campus Cobán',
          telefono: formState.telefono.trim() || null,
          nfc_token: formState.nfc_token_hash.trim() || null,
        });

        if (!res.success) {
          throw new Error(res.message);
        }

        await recordAuditLog({
          tabla_afectada: 'users',
          registro_id: editingUserId,
          operacion: 'UPDATE',
          usuario_id: currentUser.id,
          datos_anteriores: previousUser as unknown as Record<string, unknown>,
          datos_nuevos: res.updatedData || { rol: normalizedRole },
        });

        onFeedback({
          type: 'success',
          message: res.message,
        });
        resetForm();
        await onReloadUsers();
      } else {
        if (!formState.password || formState.password.length < 6) {
          onFeedback({
            type: 'error',
            message: 'Para registrar un usuario ingresa una contraseña inicial de al menos 6 caracteres.',
          });
          setIsSaving(false);
          return;
        }

        const normalizedRole = normalizeUserRole(formState.rol);

        const res = await createAdminUserAction({
          nombres: formState.nombres.trim(),
          apellidos: formState.apellidos.trim(),
          correo: formState.correo.trim(),
          password: formState.password,
          rol: normalizedRole,
          fecha_nacimiento: formState.fecha_nacimiento || '2000-01-01',
          direccion: formState.direccion.trim() || 'Campus Cobán',
          telefono: formState.telefono.trim() || null,
          nfc_token: formState.nfc_token_hash.trim() || null,
        });

        if (!res.success) {
          throw new Error(res.message);
        }

        if (res.userId) {
          await recordAuditLog({
            tabla_afectada: 'users',
            registro_id: res.userId,
            operacion: 'INSERT',
            usuario_id: currentUser.id,
            datos_nuevos: {
              id: res.userId,
              nombres: formState.nombres.trim(),
              apellidos: formState.apellidos.trim(),
              correo: formState.correo.trim(),
              rol: normalizedRole,
              fecha_nacimiento: formState.fecha_nacimiento,
              direccion: formState.direccion.trim(),
              telefono: formState.telefono.trim() || null,
              nfc_token_hash: formState.nfc_token_hash.trim() || null,
            },
          });
        }

        onFeedback({
          type: 'success',
          message: res.message,
        });
        resetForm();
        await onReloadUsers();
      }
    } catch (err: unknown) {
      console.error('[AdminUsersModule] Error al guardar usuario:', err);
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
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" autoComplete="off">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nombres"
              value={formState.nombres}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, nombres: e.target.value }))
              }
              placeholder="María José"
              autoComplete="off"
              required
            />
            <Input
              label="Apellidos"
              value={formState.apellidos}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, apellidos: e.target.value }))
              }
              placeholder="García López"
              autoComplete="off"
              required
            />
          </div>

          <div className={`grid gap-3 ${!editingUserId ? 'sm:grid-cols-2' : ''}`}>
            <Input
              label="Correo Institucional"
              type="email"
              value={formState.correo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, correo: e.target.value }))
              }
              placeholder="usuario@miumg.edu.gt"
              autoComplete="off"
              required
            />
            {!editingUserId && (
              <Input
                label="Contraseña inicial"
                type="password"
                value={formState.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Mín. 6 caracteres"
                helperText="Gestionada vía Supabase Admin API"
                autoComplete="new-password"
                required
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Rol Institucional <span className="text-rose-500 ml-1 font-bold">*</span>
              </label>
              <CustomSelect
                label=""
                value={formState.rol}
                onChange={(newRole: string) => {
                  const cleanRole = normalizeUserRole(newRole);
                  setFormState((prev) => ({
                    ...prev,
                    rol: cleanRole,
                  }));
                }}
                options={[
                  { value: 'student', label: ROLE_MAPPING.student },
                  { value: 'instructor', label: ROLE_MAPPING.instructor },
                  { value: 'administration', label: ROLE_MAPPING.administration },
                  ...(currentUser.rol === 'system'
                    ? [{ value: 'system', label: ROLE_MAPPING.system }]
                    : []),
                ]}
                fullWidth
                buttonClassName="!rounded-xl !bg-slate-50 !text-slate-900 border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-100 dark:hover:!bg-[#112b45] !py-3 !px-4 shadow-sm"
              />
            </div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Dirección / Sede"
              value={formState.direccion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, direccion: e.target.value }))
              }
              placeholder="Cobán, Alta Verapaz"
              autoComplete="off"
              required
            />
            <Input
              label="Teléfono"
              value={formState.telefono}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((prev) => ({ ...prev, telefono: e.target.value }))
              }
              placeholder="5555-1234"
              autoComplete="off"
            />
          </div>

          <Input
            label="Token NFC (Opcional)"
            value={formState.nfc_token_hash}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormState((prev) => ({
                ...prev,
                nfc_token_hash: e.target.value,
              }))
            }
            placeholder="NFC-UMG-..."
            autoComplete="off"
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
            <CustomSelect
              label=""
              value={roleFilter}
              onChange={(newValue: string) => setRoleFilter(newValue)}
              options={[
                { value: 'all', label: 'Todos los roles' },
                { value: 'student', label: 'Estudiante (student)' },
                { value: 'instructor', label: 'Catedrático (instructor)' },
                { value: 'administration', label: 'Administración (administration)' },
                { value: 'system', label: 'Sistemas (system)' },
              ]}
              fullWidth
              buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
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
