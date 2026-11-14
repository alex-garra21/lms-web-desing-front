'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Button, Input, CustomSelect } from '@/components';
import { recordAuditLog } from '../../utils';
import { updateStudentNfcAction } from '../../actions/updateStudentNfcAction';
import type { UserProfile, StatusFeedback } from '../../types';

export interface StudentNfcCredentialsModuleProps {
  currentUser: UserProfile;
  users?: UserProfile[];
  onReloadUsers?: () => Promise<void> | void;
  onFeedback: (feedback: StatusFeedback) => void;
}

export function StudentNfcCredentialsModule({
  currentUser,
  users = [],
  onReloadUsers,
  onFeedback,
}: StudentNfcCredentialsModuleProps) {
  const [students, setStudents] = useState<UserProfile[]>(() =>
    users.filter((u) => u.rol === 'student' && !u.is_deleted)
  );
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nfcFilter, setNfcFilter] = useState<string>('all');

  // Estado del Modal de Asociación / Edición NFC
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(
    null
  );
  const [nfcUidInput, setNfcUidInput] = useState('');
  const [isSavingNfc, setIsSavingNfc] = useState(false);

  // Sincronizar con la lista de usuarios recibida por props cuando cambie
  useEffect(() => {
    if (users && users.length > 0) {
      setStudents(users.filter((u) => u.rol === 'student' && !u.is_deleted));
    }
  }, [users]);

  // Consulta directa a public.users filtrando únicamente usuarios con rol 'student'
  const fetchStudentsFromDb = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('rol', 'student')
        .eq('is_deleted', false)
        .order('nombres', { ascending: true });

      if (!error && data) {
        setStudents(data as UserProfile[]);
      }
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudentsFromDb();
  }, [fetchStudentsFromDb]);

  const handleOpenNfcModal = (student: UserProfile) => {
    setSelectedStudent(student);
    setNfcUidInput(student.nfc_token_hash || '');
  };

  const handleCloseNfcModal = () => {
    if (isSavingNfc) return;
    setSelectedStudent(null);
    setNfcUidInput('');
  };

  const handleSaveNfcToken = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const cleanUid = nfcUidInput.trim();
    if (!cleanUid) {
      onFeedback({
        type: 'error',
        message:
          'Ingresa o escanea el UID de la tarjeta física (ej. 04:A3:2B:81) antes de guardar.',
      });
      return;
    }

    setIsSavingNfc(true);
    try {
      const previousToken = selectedStudent.nfc_token_hash || null;

      // 1. Intentar actualización mediante Server Action segura
      const result = await updateStudentNfcAction({
        studentId: selectedStudent.id,
        nfcTokenHash: cleanUid,
      });

      if (!result.success) {
        // Respaldo con sesión activa del administrador en cliente Supabase si aplica
        const { error: clientUpdateErr } = await supabase
          .from('users')
          .update({
            nfc_token_hash: cleanUid,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedStudent.id)
          .eq('rol', 'student');

        if (clientUpdateErr) {
          throw new Error(result.message || clientUpdateErr.message);
        }
      }

      // 2. Registrar en bitácora de auditoría
      await recordAuditLog({
        tabla_afectada: 'users',
        registro_id: selectedStudent.id,
        operacion: 'UPDATE',
        usuario_id: currentUser.id,
        datos_anteriores: { nfc_token_hash: previousToken },
        datos_nuevos: { nfc_token_hash: cleanUid },
      });

      // 3. Reflejar el cambio inmediatamente en el estado local de la tabla
      const nowIso = new Date().toISOString();
      setStudents((prev) =>
        prev.map((item) =>
          item.id === selectedStudent.id
            ? {
                ...item,
                nfc_token_hash: cleanUid,
                updated_at: nowIso,
              }
            : item
        )
      );

      onFeedback({
        type: 'success',
        message:
          result.message ||
          `Tarjeta NFC (${cleanUid}) vinculada correctamente a ${selectedStudent.nombres} ${selectedStudent.apellidos}.`,
      });

      setSelectedStudent(null);
      setNfcUidInput('');

      await fetchStudentsFromDb();
      if (onReloadUsers) {
        await onReloadUsers();
      }
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo vincular la tarjeta NFC al estudiante.',
      });
    } finally {
      setIsSavingNfc(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const hasToken = Boolean(
        student.nfc_token_hash && student.nfc_token_hash.trim()
      );
      const matchesFilter =
        nfcFilter === 'all' ||
        (nfcFilter === 'linked' && hasToken) ||
        (nfcFilter === 'unlinked' && !hasToken);

      const matchesSearch =
        !query ||
        `${student.nombres} ${student.apellidos}`.toLowerCase().includes(query) ||
        student.correo.toLowerCase().includes(query) ||
        (student.nfc_token_hash || '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [students, searchQuery, nfcFilter]);

  const totalStudents = students.length;
  const linkedCount = useMemo(
    () =>
      students.filter((s) => Boolean(s.nfc_token_hash && s.nfc_token_hash.trim()))
        .length,
    [students]
  );
  const unlinkedCount = totalStudents - linkedCount;

  return (
    <div className="space-y-6">
      {/* Resumen de credenciales NFC estudiantiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Estudiantes (`student`)
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {totalStudents}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs dark:border-emerald-500/20 dark:bg-emerald-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Carnés NFC Vinculados
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-200">
            {linkedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs dark:border-amber-500/20 dark:bg-amber-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Pendientes de Vincular
          </p>
          <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">
            {unlinkedCount}
          </p>
        </div>
      </div>

      {/* Tabla principal de estudiantes y estado NFC */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Credenciales físicas de laboratorio (`public.users`)
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Vinculación de Tarjetas NFC para Estudiantes ({filteredStudents.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Asocia o actualiza el UID de la tarjeta física NFC (`nfc_token_hash`) para habilitar la validación de exámenes presenciales.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[460px]">
            <Input
              placeholder="Buscar por alumno, correo o UID NFC..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
            />
            <CustomSelect
              label=""
              value={nfcFilter}
              onChange={(val: string) => setNfcFilter(val)}
              options={[
                { value: 'all', label: 'Todos los estudiantes' },
                { value: 'linked', label: 'Con carné NFC activo' },
                { value: 'unlinked', label: 'Sin tarjeta asignada' },
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
                <th className="px-4 py-3.5">Estudiante</th>
                <th className="px-4 py-3.5">Correo Institucional</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Token / UID NFC (`nfc_token_hash`)</th>
                <th className="px-4 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoadingStudents && filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Cargando listado de estudiantes...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const hasNfc = Boolean(
                    student.nfc_token_hash && student.nfc_token_hash.trim()
                  );

                  return (
                    <tr
                      key={student.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {student.nombres} {student.apellidos}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Rol: Estudiante (`student`)
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {student.correo}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </span>
                          {hasNfc ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              Carné Activo
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                              Sin Carné
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {hasNfc ? (
                          <code className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {student.nfc_token_hash}
                          </code>
                        ) : (
                          <span className="text-xs italic text-slate-400">
                            Sin tarjeta asignada
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Button
                          type="button"
                          variant={hasNfc ? 'secondary' : 'brand'}
                          size="sm"
                          onClick={() => handleOpenNfcModal(student)}
                        >
                          {hasNfc ? 'Editar NFC' : 'Vincular Tarjeta'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Asociación / Edición de UID NFC */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nfc-title"
        >
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-surface p-6 shadow-2xl dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  {selectedStudent.nfc_token_hash
                    ? 'Actualizar Credencial NFC'
                    : 'Asociar Nueva Tarjeta NFC'}
                </p>
                <h3
                  id="modal-nfc-title"
                  className="mt-1 text-xl font-black text-foreground"
                >
                  {selectedStudent.nombres} {selectedStudent.apellidos}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedStudent.correo}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseNfcModal}
                disabled={isSavingNfc}
                className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNfcToken} className="mt-5 space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs leading-5 text-slate-700 dark:border-blue-500/20 dark:bg-blue-950/30 dark:text-slate-300">
                Acerca la tarjeta física al lector USB/NFC o escribe manualmente el identificador único (UID) de la tarjeta del estudiante.
              </div>

              <Input
                label="UID / Token de la Tarjeta Física NFC"
                value={nfcUidInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNfcUidInput(e.target.value)
                }
                placeholder="Ej. 04:A3:2B:81"
                helperText="Se almacenará en la columna public.users.nfc_token_hash"
                autoFocus
                required
              />

              {selectedStudent.nfc_token_hash && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Token actual asignado:{' '}
                  <code className="font-mono font-bold text-foreground">
                    {selectedStudent.nfc_token_hash}
                  </code>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSavingNfc}
                  onClick={handleCloseNfcModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  isLoading={isSavingNfc}
                >
                  Guardar Token NFC
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
