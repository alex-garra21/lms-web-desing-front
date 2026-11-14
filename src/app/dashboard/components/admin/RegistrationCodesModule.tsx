'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, Select } from '@/components';
import { maskRoute } from '@/utils/routeHasher';
import {
  generateInstitutionalCode,
  formatDateTime,
  recordAuditLog,
} from '../../utils';
import type {
  UserProfile,
  RegistrationCodeRecord,
  CourseRecord,
  StatusFeedback,
  CodeType,
} from '../../types';

export interface RegistrationCodesModuleProps {
  currentUser: UserProfile;
  codes: RegistrationCodeRecord[];
  courses: CourseRecord[];
  onReloadCodes: () => Promise<void> | void;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function RegistrationCodesModule({
  currentUser,
  codes,
  courses,
  onReloadCodes,
  onFeedback,
}: RegistrationCodesModuleProps) {
  const [tipo, setTipo] = useState<CodeType>('account_creation');
  const [cursoId, setCursoId] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterUsed, setFilterUsed] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  const courseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((course) => map.set(course.id, course.titulo));
    return map;
  }, [courses]);

  const handleGenerateCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (tipo === 'course_enrollment' && !cursoId) {
      onFeedback({
        type: 'error',
        message: 'Selecciona un curso destino para generar un código de inscripción.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const normalizedCode =
        codigo.trim().toUpperCase() ||
        (tipo === 'course_enrollment'
          ? generateInstitutionalCode('UMG-CRS')
          : null);

      const insertRecord: {
        codigo?: string | null;
        tipo: CodeType;
        curso_id: string | null;
        created_by: string;
      } = {
        tipo,
        curso_id: tipo === 'course_enrollment' ? cursoId : null,
        created_by: currentUser.id,
      };

      if (normalizedCode) {
        insertRecord.codigo = normalizedCode;
      }

      const { data: created, error } = await supabase
        .from('registration_codes')
        .insert([insertRecord])
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (created?.id) {
        await recordAuditLog({
          tabla_afectada: 'registration_codes',
          registro_id: created.id,
          operacion: 'INSERT',
          usuario_id: currentUser.id,
          datos_nuevos: created as Record<string, unknown>,
        });
      }

      setCodigo('');
      onFeedback({
        type: 'success',
        message: `Código ${created?.codigo || normalizedCode || ''} generado exitosamente.`,
      });
      await onReloadCodes();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo generar el código en registration_codes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeCode = async (item: RegistrationCodeRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('registration_codes')
        .update({ is_deleted: true })
        .eq('id', item.id);

      if (error) throw new Error(error.message);

      await recordAuditLog({
        tabla_afectada: 'registration_codes',
        registro_id: item.id,
        operacion: 'SOFT_DELETE',
        usuario_id: currentUser.id,
        datos_anteriores: item as unknown as Record<string, unknown>,
        datos_nuevos: { is_deleted: true },
      });

      onFeedback({
        type: 'success',
        message: `Código ${item.codigo} revocado correctamente.`,
      });
      await onReloadCodes();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al revocar el código.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onFeedback({ type: 'success', message: `Código ${value} copiado al portapapeles.` });
    } catch {
      onFeedback({ type: 'error', message: 'No se pudo copiar automáticamente al portapapeles.' });
    }
  };

  const filteredCodes = useMemo(() => {
    return codes.filter((item) => {
      const matchesType = filterTipo === 'all' || item.tipo === filterTipo;
      const matchesUsed =
        filterUsed === 'all' ||
        (filterUsed === 'used' ? item.is_used : !item.is_used);
      return matchesType && matchesUsed;
    });
  }, [codes, filterTipo, filterUsed]);

  return (
    <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Emisión institucional
        </p>
        <h2 className="mt-1 text-xl font-black text-foreground">
          Generar código de acceso
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Emite códigos de creación de cuenta (<code className="font-mono text-xs">account_creation</code>) o asignación directa a un curso (<code className="font-mono text-xs">course_enrollment</code>).
        </p>

        <form onSubmit={handleGenerateCode} className="mt-5 space-y-4">
          <Select
            label="Tipo de código"
            value={tipo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setTipo(e.target.value as CodeType)
            }
            options={[
              { value: 'account_creation', label: 'Creación de Cuenta (account_creation)' },
              { value: 'course_enrollment', label: 'Inscripción a Curso (course_enrollment)' },
            ]}
            required
          />

          {tipo === 'course_enrollment' && (
            <Select
              label="Curso asignado"
              value={cursoId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setCursoId(e.target.value)
              }
              placeholder="Selecciona un curso activo"
              options={courses.map((course) => ({
                value: course.id,
                label: course.titulo,
              }))}
              required
            />
          )}

          <div className="space-y-2">
            <Input
              label="Código personalizado (Opcional)"
              value={codigo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCodigo(e.target.value.toUpperCase())
              }
              placeholder={
                tipo === 'account_creation'
                  ? 'Vacío = trigger automático de BD'
                  : 'UMG-CRS-2026...'
              }
              helperText={
                tipo === 'account_creation'
                  ? 'Si se deja vacío, PostgreSQL genera 20 caracteres aleatorios.'
                  : 'Si se deja vacío, se genera un código institucional único.'
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setCodigo(
                  generateInstitutionalCode(
                    tipo === 'account_creation' ? 'UMG-ACC' : 'UMG-CRS'
                  )
                )
              }
            >
              Sugerir código aleatorio
            </Button>
          </div>

          <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
            Emitir Código
          </Button>
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Control de registration_codes
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Códigos emitidos ({filteredCodes.length})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={filterTipo}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFilterTipo(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todos los tipos' },
                { value: 'account_creation', label: 'account_creation' },
                { value: 'course_enrollment', label: 'course_enrollment' },
              ]}
            />
            <Select
              value={filterUsed}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFilterUsed(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'available', label: 'Disponibles' },
                { value: 'used', label: 'Utilizados' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No hay códigos registrados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {item.curso_id ? (
                        <Link
                          href={maskRoute(`/courses/${item.curso_id}`)}
                          className="font-semibold text-brand hover:underline"
                        >
                          {courseNameMap.get(item.curso_id) || 'Ver curso'}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Registro general</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.is_used ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                          Utilizado
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copyCode(item.codigo)}
                        >
                          Copiar
                        </Button>
                        {!item.is_used && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => handleRevokeCode(item)}
                          >
                            Revocar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
