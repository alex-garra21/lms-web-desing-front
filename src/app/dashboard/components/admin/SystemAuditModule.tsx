'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Button, CustomSelect } from '@/components';
import { maskRoute, encodeId } from '@/utils/routeHasher';
import { formatDateTime, recordAuditLog } from '../../utils';
import type {
  UserProfile,
  AuditLogRecord,
  SoftDeletedItem,
  StatusFeedback,
} from '../../types';

export interface SystemAuditModuleProps {
  currentUser: UserProfile;
  auditLogs: AuditLogRecord[];
  softDeletedItems: SoftDeletedItem[];
  users: UserProfile[];
  onReloadAudit: () => Promise<void> | void;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function SystemAuditModule({
  currentUser,
  auditLogs,
  softDeletedItems,
  users,
  onReloadAudit,
  onFeedback,
}: SystemAuditModuleProps) {
  const [tableFilter, setTableFilter] = useState('all');
  const [operationFilter, setOperationFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const userEmailMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, `${u.nombres} ${u.apellidos} (${u.correo})`));
    return map;
  }, [users]);

  const availableTables = useMemo(() => {
    const set = new Set(auditLogs.map((log) => log.tabla_afectada));
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchTable =
        tableFilter === 'all' || log.tabla_afectada === tableFilter;
      const matchOp =
        operationFilter === 'all' ||
        log.operacion.toUpperCase() === operationFilter;
      return matchTable && matchOp;
    });
  }, [auditLogs, tableFilter, operationFilter]);

  const handleRestoreLogicalDelete = async (item: SoftDeletedItem) => {
    setIsRestoring(true);
    try {
      const updatePayload: Record<string, unknown> = { is_deleted: false };
      if (item.table === 'users') {
        updatePayload.deleted_at = null;
        updatePayload.deleted_by = null;
        updatePayload.updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(item.table)
        .update(updatePayload)
        .eq('id', item.id);

      if (error) throw new Error(error.message);

      await recordAuditLog({
        tabla_afectada: item.table,
        registro_id: item.id,
        operacion: 'RESTORE',
        usuario_id: currentUser.id,
        datos_anteriores: { is_deleted: true },
        datos_nuevos: { is_deleted: false },
      });

      onFeedback({
        type: 'success',
        message: `Registro "${item.label}" restaurado en ${item.table}.`,
      });
      await onReloadAudit();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo restaurar el borrado lógico.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Bitácora de Auditoría */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Exclusivo rol system
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Bitácora de Auditoría General (<code className="font-mono text-xl">audit_logs</code>)
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CustomSelect
              label=""
              value={tableFilter}
              onChange={(newValue: string) => setTableFilter(newValue)}
              options={[
                { value: 'all', label: 'Todas las tablas' },
                ...availableTables.map((table) => ({ value: table, label: table })),
              ]}
              fullWidth
              buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
            />
            <CustomSelect
              label=""
              value={operationFilter}
              onChange={(newValue: string) => setOperationFilter(newValue)}
              options={[
                { value: 'all', label: 'Todas las operaciones' },
                { value: 'INSERT', label: 'INSERT' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'SOFT_DELETE', label: 'SOFT_DELETE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'RESTORE', label: 'RESTORE' },
              ]}
              fullWidth
              buttonClassName="!rounded-xl !bg-surface !text-foreground border !border-slate-300 dark:!border-slate-700 dark:!bg-[#0c1f34] dark:!text-white hover:!bg-slate-50 dark:hover:!bg-[#112b45] !py-2.5 !px-3.5 shadow-sm"
            />
            <Button variant="secondary" onClick={() => onReloadAudit()}>
              Actualizar bitácora
            </Button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tabla</th>
                <th className="px-4 py-3">Operación</th>
                <th className="px-4 py-3">Ejecutado por</th>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No existen registros de auditoría para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const maskedRef = encodeId(log.registro_id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                          {log.tabla_afectada}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              log.operacion.includes('DELETE')
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                : log.operacion === 'INSERT'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            }`}
                          >
                            {log.operacion}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {log.usuario_id
                            ? userEmailMap.get(log.usuario_id) || encodeId(log.usuario_id)
                            : 'Sistema / Trigger'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                          <Link
                            href={maskRoute(`/dashboard?tab=audit&ref=${maskedRef}`)}
                            className="hover:text-brand hover:underline"
                          >
                            {maskedRef}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                          >
                            {isExpanded ? 'Ocultar JSON' : 'Ver detalle'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-900/60">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  datos_anteriores
                                </p>
                                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-surface p-3 font-mono text-xs text-foreground dark:border-slate-800">
                                  {JSON.stringify(log.datos_anteriores, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  datos_nuevos
                                </p>
                                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-surface p-3 font-mono text-xs text-foreground dark:border-slate-800">
                                  {JSON.stringify(log.datos_nuevos, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Registros con Borrado Lógico */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Supervisión de integridad
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Registros con Borrado Lógico (<code className="font-mono text-xl">is_deleted = true</code>)
        </h2>

        {softDeletedItems.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            No se detectaron registros marcados como eliminados lógicamente.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {softDeletedItems.map((item) => (
              <article
                key={`${item.table}-${item.id}`}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      {item.table}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-foreground">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {item.detail}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <span className="font-mono text-[11px] text-slate-400">
                    Ref: {encodeId(item.id)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isRestoring}
                    onClick={() => handleRestoreLogicalDelete(item)}
                  >
                    Restaurar registro
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
