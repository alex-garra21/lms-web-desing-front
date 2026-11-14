"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import CourseCard from '@/components/CourseCard';
import VideoPlayer from '@/components/VideoPlayer';
import { supabase } from '@/utils/supabaseClient';
import {
  createMaskedUrl,
  decodeId,
  encodeId,
  maskRoute,
} from '@/utils/routeHasher';
import { getRoleDisplayName } from '@/utils/roleHelper';
import { ShowPasswordIcon, HidePasswordIcon } from '@/utils/icons/showeyes';

// =====================================================================
// Tipos alineados estrictamente con Schema.sql
// =====================================================================

type UserRole = 'system' | 'administration' | 'instructor' | 'student';
type CodeType = 'account_creation' | 'course_enrollment';
type ExamModality = 'virtual' | 'presencial';
type ExamType = 'parcial' | 'final';

interface UserProfile {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  fecha_nacimiento: string;
  direccion: string;
  telefono: string | null;
  avatar: string | null;
  rol: UserRole;
  codigo_empleado: string | null;
  nfc_token_hash: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseRecord {
  id: string;
  titulo: string;
  descripcion: string;
  instructor_id: string;
  codigo_asignacion: string | null;
  thumbnail: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface RegistrationCodeRecord {
  id: string;
  codigo: string;
  tipo: CodeType;
  curso_id: string | null;
  is_used: boolean;
  used_by: string | null;
  created_by: string;
  is_deleted: boolean;
  created_at: string;
}

interface AuditLogRecord {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  operacion: string;
  usuario_id: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
}

interface ModuleRecord {
  id: string;
  course_id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  is_deleted: boolean;
  created_at: string;
}

interface ContentRecord {
  id: string;
  module_id: string;
  titulo: string;
  cuerpo: string | null;
  youtube_url: string | null;
  orden: number;
  is_deleted: boolean;
  created_at: string;
}

interface AssignmentRecord {
  id: string;
  module_id: string;
  titulo: string;
  descripcion: string;
  fecha_limite: string;
  punteo_maximo: number;
  is_deleted: boolean;
  created_at: string;
}

interface ExamRecord {
  id: string;
  module_id: string;
  titulo: string;
  tipo: ExamType;
  modalidad: ExamModality;
  fecha_apertura: string;
  fecha_cierre: string;
  punteo_maximo: number;
  is_deleted: boolean;
  created_at: string;
}

interface EnrollmentRecord {
  id: string;
  student_id: string;
  course_id: string;
  progreso_porcentaje: number;
  calificacion_final: number | null;
  is_active: boolean;
  is_deleted: boolean;
  enrolled_at: string;
  courses?: CourseRecord | null;
}

interface AssignmentSubmissionRecord {
  id: string;
  assignment_id: string;
  student_id: string;
  archivo_url: string | null;
  comentario: string | null;
  calificacion: number | null;
  calificado_at: string | null;
  created_at: string;
}

interface ExamSubmissionRecord {
  id: string;
  exam_id: string;
  student_id: string;
  calificacion_automatica: number;
  asistencia_verificada: boolean;
  created_at: string;
}

interface CourseReviewRecord {
  id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comentario: string | null;
  is_deleted: boolean;
  created_at: string;
}

interface SoftDeletedItem {
  table: string;
  id: string;
  label: string;
  detail: string;
  timestamp: string;
}

interface StatusFeedback {
  type: 'success' | 'error';
  message: string;
}

interface DashboardTab {
  id: string;
  label: string;
  description: string;
}

// =====================================================================
// Metadatos y Utilidades
// =====================================================================

const ROLE_META: Record<
  UserRole,
  {
    label: string;
    panelBadge: string;
    navbarRole: UserRole;
    subtitle: string;
  }
> = {
  system: {
    label: 'Sistemas y Auditoría (system)',
    panelBadge: 'Panel de Sistemas · Control Total',
    navbarRole: 'system',
    subtitle:
      'Supervisa usuarios, emisión de códigos institucionales, bitácoras de auditoría y borrados lógicos en Campus Cobán.',
  },
  administration: {
    label: 'Administración y Secretaría (administration)',
    panelBadge: 'Panel Administrativo · Secretaría Académica',
    navbarRole: 'administration',
    subtitle:
      'Gestiona colaboradores y estudiantes, genera códigos de creación de cuentas y controla asignaciones de cursos.',
  },
  instructor: {
    label: 'Catedrático / Instructor (instructor)',
    panelBadge: 'Panel Docente · Gestión Académica',
    navbarRole: 'instructor',
    subtitle:
      'Administra tus cursos asignados, módulos bimestrales, recursos multimedia, tareas, exámenes y calificaciones.',
  },
  student: {
    label: 'Estudiante (student)',
    panelBadge: 'Panel del Estudiante',
    navbarRole: 'student',
    subtitle:
      'Consulta tus cursos inscritos, avanza en tus lecciones, entrega tareas, rinde evaluaciones con NFC y publica reseñas.',
  },
};

const PROFILE_TAB: DashboardTab = {
  id: 'profile',
  label: 'Editar Datos',
  description: 'Actualiza tu información personal, contacto y foto de perfil',
};

const SECURITY_TAB: DashboardTab = {
  id: 'security',
  label: 'Seguridad',
  description: 'Actualiza y protege tu contraseña institucional',
};

const TABS_BY_ROLE: Record<UserRole, DashboardTab[]> = {
  system: [
    {
      id: 'users',
      label: 'Gestión de Usuarios',
      description: 'Alta, edición y listado de colaboradores y estudiantes',
    },
    {
      id: 'codes',
      label: 'Códigos de Registro e Inscripción',
      description: 'Generación y control de account_creation y course_enrollment',
    },
    {
      id: 'audit',
      label: 'Auditoría General',
      description: 'Supervisión de audit_logs y borrados lógicos',
    },
    PROFILE_TAB,
    SECURITY_TAB,
  ],
  administration: [
    {
      id: 'users',
      label: 'Gestión de Usuarios',
      description: 'Alta, edición y listado de colaboradores y estudiantes',
    },
    {
      id: 'codes',
      label: 'Códigos de Registro e Inscripción',
      description: 'Generación y control de account_creation y course_enrollment',
    },
    PROFILE_TAB,
    SECURITY_TAB,
  ],
  instructor: [
    {
      id: 'courses',
      label: 'Cursos Asignados',
      description: 'Gestión de módulos, videos y recursos académicos',
    },
    {
      id: 'evaluations',
      label: 'Evaluaciones y Tareas',
      description: 'Creación de tareas, exámenes y calificación de entregas',
    },
    PROFILE_TAB,
    SECURITY_TAB,
  ],
  student: [
    {
      id: 'my-courses',
      label: 'Mis Cursos',
      description: 'Inscripciones activas, progreso y acceso a lecciones',
    },
    {
      id: 'tasks-exams',
      label: 'Tareas y Exámenes',
      description: 'Pendientes, entregas y evaluaciones con validación NFC',
    },
    {
      id: 'reviews',
      label: 'Reseñas',
      description: 'Calificación por estrellas y comentarios de cursos finalizados',
    },
    PROFILE_TAB,
    SECURITY_TAB,
  ],
};

function isValidUserRole(value: unknown): value is UserRole {
  return (
    value === 'system' ||
    value === 'administration' ||
    value === 'instructor' ||
    value === 'student'
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildSubmissionStoragePath(
  userId: string,
  assignmentId: string,
  fileName: string
): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${userId}/${assignmentId}/${timestamp}_${sanitizedName}`;
}

function generateInstitutionalCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${random}`;
}

function extractResourceLinks(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function createEphemeralAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function recordAuditLog(params: {
  tabla_afectada: string;
  registro_id: string;
  operacion: string;
  usuario_id: string;
  datos_anteriores?: Record<string, unknown> | null;
  datos_nuevos?: Record<string, unknown> | null;
}) {
  try {
    await supabase.from('audit_logs').insert([
      {
        tabla_afectada: params.tabla_afectada,
        registro_id: params.registro_id,
        operacion: params.operacion,
        usuario_id: params.usuario_id,
        datos_anteriores: params.datos_anteriores ?? null,
        datos_nuevos: params.datos_nuevos ?? null,
      },
    ]);
  } catch {
    // Si la política RLS o un trigger de BD gestiona audit_logs automáticamente, evitamos interrumpir el flujo.
  }
}

const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    prompt: '¿Qué mecanismo garantiza la seguridad de acceso por fila directamente en PostgreSQL/Supabase?',
    options: [
      'Row Level Security (RLS)',
      'Estilos en cascada CSS',
      'LocalStorage sin cifrado',
    ],
    correctIndex: 0,
  },
  {
    id: 'q2',
    prompt: '¿Para qué se emplea el enmascaramiento de rutas (maskRoute) en el LMS UMG?',
    options: [
      'Para comprimir imágenes de portada',
      'Para prevenir ataques IDOR ocultando IDs directos en las URLs',
      'Para acelerar la velocidad de descarga de archivos PDF',
    ],
    correctIndex: 1,
  },
  {
    id: 'q3',
    prompt: '¿Qué valida la credencial NFC en evaluaciones presenciales del Campus Cobán?',
    options: [
      'El tema oscuro del navegador',
      'La presencia física del estudiante en el laboratorio del campus',
      'La cantidad de estrellas de una reseña',
    ],
    correctIndex: 1,
  },
];

// =====================================================================
// Módulo 1 (system / administration): Gestión de Usuarios
// =====================================================================

function AdminUsersModule({
  currentUser,
  users,
  focusedUserId,
  onReloadUsers,
  onFeedback,
}: {
  currentUser: UserProfile;
  users: UserProfile[];
  focusedUserId: string | null;
  onReloadUsers: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
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
                { value: 'student', label: 'student' },
                { value: 'instructor', label: 'instructor' },
                { value: 'administration', label: 'administration' },
                { value: 'system', label: 'system' },
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
                          {user.rol}
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

// =====================================================================
// Módulo 2 (system / administration): Códigos de Registro e Inscripción
// =====================================================================

function RegistrationCodesModule({
  currentUser,
  codes,
  courses,
  onReloadCodes,
  onFeedback,
}: {
  currentUser: UserProfile;
  codes: RegistrationCodeRecord[];
  courses: CourseRecord[];
  onReloadCodes: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
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
          Emite códigos de creación de cuenta (`account_creation`) o asignación directa a un curso (`course_enrollment`).
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

// =====================================================================
// Módulo 3 (EXCLUSIVO system): Auditoría General y Borrados Lógicos
// =====================================================================

function SystemAuditModule({
  currentUser,
  auditLogs,
  softDeletedItems,
  users,
  onReloadAudit,
  onFeedback,
}: {
  currentUser: UserProfile;
  auditLogs: AuditLogRecord[];
  softDeletedItems: SoftDeletedItem[];
  users: UserProfile[];
  onReloadAudit: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
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
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Exclusivo rol system
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Bitácora de Auditoría General (`audit_logs`)
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={tableFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setTableFilter(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todas las tablas' },
                ...availableTables.map((table) => ({ value: table, label: table })),
              ]}
            />
            <Select
              value={operationFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setOperationFilter(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todas las operaciones' },
                { value: 'INSERT', label: 'INSERT' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'SOFT_DELETE', label: 'SOFT_DELETE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'RESTORE', label: 'RESTORE' },
              ]}
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

      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Supervisión de integridad
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Registros con Borrado Lógico (`is_deleted = true`)
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

// =====================================================================
// Módulo 4 (instructor): Cursos Asignados, Módulos y Contenidos
// =====================================================================

function InstructorCoursesModule({
  currentUser,
  courses,
  modules,
  contents,
  selectedCourseId,
  selectedModuleId,
  onSelectCourse,
  onSelectModule,
  onReloadAcademic,
  onFeedback,
}: {
  currentUser: UserProfile;
  courses: CourseRecord[];
  modules: ModuleRecord[];
  contents: ContentRecord[];
  selectedCourseId: string;
  selectedModuleId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onReloadAcademic: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState<ContentRecord | null>(null);

  // Formulario de curso
  const [courseForm, setCourseForm] = useState({
    titulo: '',
    descripcion: '',
    codigo_asignacion: '',
    thumbnail: '',
  });

  // Formulario de módulo
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({
    titulo: '',
    descripcion: '',
    orden: '1',
  });

  // Formulario de contenido
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState({
    module_id: selectedModuleId || '',
    titulo: '',
    cuerpo: '',
    youtube_url: '',
    orden: '1',
  });

  const courseModules = useMemo(
    () =>
      modules
        .filter((m) => m.course_id === selectedCourseId)
        .sort((a, b) => a.orden - b.orden),
    [modules, selectedCourseId]
  );

  const effectiveContentModuleId =
    contentForm.module_id || selectedModuleId || courseModules[0]?.id || '';

  const visibleContents = useMemo(() => {
    const moduleIds = new Set(courseModules.map((m) => m.id));
    return contents
      .filter(
        (c) =>
          moduleIds.has(c.module_id) &&
          (!selectedModuleId || c.module_id === selectedModuleId)
      )
      .sort((a, b) => a.orden - b.orden);
  }, [contents, courseModules, selectedModuleId]);

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!courseForm.titulo.trim() || !courseForm.descripcion.trim()) {
      onFeedback({
        type: 'error',
        message: 'Ingresa el título y descripción del curso.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        titulo: courseForm.titulo.trim(),
        descripcion: courseForm.descripcion.trim(),
        instructor_id: currentUser.id,
        codigo_asignacion:
          courseForm.codigo_asignacion.trim().toUpperCase() ||
          generateInstitutionalCode('UMG'),
        thumbnail: courseForm.thumbnail.trim() || null,
        is_active: true,
      };

      const { data: created, error } = await supabase
        .from('courses')
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      setCourseForm({
        titulo: '',
        descripcion: '',
        codigo_asignacion: '',
        thumbnail: '',
      });
      onFeedback({
        type: 'success',
        message: `Curso "${payload.titulo}" publicado y asignado a tu cátedra.`,
      });
      await onReloadAcademic();
      if (created?.id) onSelectCourse(created.id);
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el curso.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourseId) {
      onFeedback({
        type: 'error',
        message: 'Selecciona primero uno de tus cursos asignados.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        course_id: selectedCourseId,
        titulo: moduleForm.titulo.trim(),
        descripcion: moduleForm.descripcion.trim() || null,
        orden: Number(moduleForm.orden) || 1,
      };

      if (editingModuleId) {
        const { error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', editingModuleId);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Módulo actualizado correctamente.' });
      } else {
        const { error } = await supabase.from('modules').insert([payload]);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Módulo creado en el curso.' });
      }

      setEditingModuleId(null);
      setModuleForm({ titulo: '', descripcion: '', orden: String(courseModules.length + 2) });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el módulo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteModule = async (mod: ModuleRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_deleted: true })
        .eq('id', mod.id);
      if (error) throw new Error(error.message);

      onFeedback({ type: 'success', message: `Módulo "${mod.titulo}" archivado.` });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo archivar el módulo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const targetModuleId = effectiveContentModuleId;
    if (!targetModuleId) {
      onFeedback({
        type: 'error',
        message: 'Selecciona un módulo destino para agregar el contenido.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: targetModuleId,
        titulo: contentForm.titulo.trim(),
        cuerpo: contentForm.cuerpo.trim() || null,
        youtube_url: contentForm.youtube_url.trim() || null,
        orden: Number(contentForm.orden) || 1,
      };

      if (editingContentId) {
        const { error } = await supabase
          .from('contents')
          .update(payload)
          .eq('id', editingContentId);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Contenido actualizado correctamente.' });
      } else {
        const { error } = await supabase.from('contents').insert([payload]);
        if (error) throw new Error(error.message);
        onFeedback({ type: 'success', message: 'Lección / recurso agregado al módulo.' });
      }

      setEditingContentId(null);
      setContentForm({
        module_id: targetModuleId,
        titulo: '',
        cuerpo: '',
        youtube_url: '',
        orden: String(visibleContents.length + 2),
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el contenido.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteContent = async (content: ContentRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contents')
        .update({ is_deleted: true })
        .eq('id', content.id);
      if (error) throw new Error(error.message);

      onFeedback({ type: 'success', message: `Contenido "${content.titulo}" eliminado.` });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo eliminar el contenido.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Mis cursos impartidos
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Cursos asignados ({courses.length})
            </h2>
          </div>

          {courses.length > 0 && (
            <div className="w-full md:w-80">
              <Select
                label="Curso activo en edición"
                value={selectedCourseId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  onSelectCourse(e.target.value);
                  onSelectModule('');
                }}
                options={courses.map((course) => ({
                  value: course.id,
                  label: course.titulo,
                }))}
              />
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Aún no tienes cursos asignados en `courses`. Crea uno nuevo en el formulario inferior.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const isSelected = course.id === selectedCourseId;
              return (
                <article
                  key={course.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-brand bg-blue-50/50 shadow-sm dark:border-brand dark:bg-blue-500/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {course.codigo_asignacion || 'SIN-COD'}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          course.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                        }`}
                      >
                        {course.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-foreground">
                      {course.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {course.descripcion}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={isSelected ? 'brand' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        onSelectCourse(course.id);
                        onSelectModule('');
                      }}
                    >
                      {isSelected ? 'Editando' : 'Gestionar'}
                    </Button>
                    <Button
                      href={maskRoute(`/courses/${course.id}`)}
                      variant="ghost"
                      size="sm"
                    >
                      Vista pública
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gestión de Módulos */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Estructura curricular (`modules`)
          </p>
          <h3 className="mt-1 text-xl font-black text-foreground">
            Módulos del curso ({courseModules.length})
          </h3>

          <form onSubmit={handleSaveModule} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <Input
                label="Título del módulo"
                value={moduleForm.titulo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModuleForm((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ej. Módulo 1: Arquitectura"
                required
              />
              <Input
                label="Orden"
                type="number"
                min={1}
                value={moduleForm.orden}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setModuleForm((prev) => ({ ...prev, orden: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="Descripción"
              value={moduleForm.descripcion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setModuleForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Objetivos bimestrales del módulo"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="brand" size="sm" isLoading={isSaving}>
                {editingModuleId ? 'Actualizar Módulo' : 'Agregar Módulo'}
              </Button>
              {editingModuleId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingModuleId(null);
                    setModuleForm({ titulo: '', descripcion: '', orden: '1' });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {courseModules.map((mod) => (
              <article
                key={mod.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  selectedModuleId === mod.id
                    ? 'border-brand bg-blue-50/40 dark:border-brand dark:bg-blue-500/10'
                    : 'border-slate-200 bg-surface dark:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                      Módulo #{mod.orden}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{mod.titulo}</h4>
                    {mod.descripcion && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {mod.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      href={maskRoute(
                        `/dashboard?tab=courses&course=${encodeId(selectedCourseId)}&module=${encodeId(mod.id)}`
                      )}
                      variant={selectedModuleId === mod.id ? 'brand' : 'secondary'}
                      size="sm"
                      onClick={() => onSelectModule(mod.id)}
                    >
                      Lecciones
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingModuleId(mod.id);
                        setModuleForm({
                          titulo: mod.titulo,
                          descripcion: mod.descripcion || '',
                          orden: String(mod.orden),
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSoftDeleteModule(mod)}
                    >
                      Archivar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Gestión de Contenidos y Recursos */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Lecciones, videos y recursos (`contents`)
          </p>
          <h3 className="mt-1 text-xl font-black text-foreground">
            Contenidos del módulo ({visibleContents.length})
          </h3>

          <form onSubmit={handleSaveContent} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <Select
                label="Módulo"
                value={effectiveContentModuleId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setContentForm((prev) => ({ ...prev, module_id: e.target.value }))
                }
                placeholder="Selecciona módulo"
                options={courseModules.map((m) => ({
                  value: m.id,
                  label: `${m.orden}. ${m.titulo}`,
                }))}
                required
              />
              <Input
                label="Orden"
                type="number"
                min={1}
                value={contentForm.orden}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setContentForm((prev) => ({ ...prev, orden: e.target.value }))
                }
                required
              />
            </div>

            <Input
              label="Título de la lección o recurso"
              value={contentForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setContentForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Clase 01: Introducción a PostgreSQL"
              required
            />

            <Input
              label="Enlace de Video (YouTube o MP4)"
              type="url"
              value={contentForm.youtube_url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setContentForm((prev) => ({
                  ...prev,
                  youtube_url: e.target.value,
                }))
              }
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contenido y enlaces de recursos adicionales
              </label>
              <textarea
                rows={3}
                value={contentForm.cuerpo}
                onChange={(e) =>
                  setContentForm((prev) => ({ ...prev, cuerpo: e.target.value }))
                }
                placeholder="Resumen de clase, instrucciones y URLs de material descargable (PDF, repositorio, guías)."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="brand" size="sm" isLoading={isSaving}>
                {editingContentId ? 'Actualizar Contenido' : 'Agregar Contenido'}
              </Button>
              {editingContentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingContentId(null);
                    setContentForm({
                      module_id: selectedModuleId || '',
                      titulo: '',
                      cuerpo: '',
                      youtube_url: '',
                      orden: '1',
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {visibleContents.map((content) => (
              <article
                key={content.id}
                className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                      Lección #{content.orden}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {content.titulo}
                    </h4>
                    {content.cuerpo && (
                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {content.cuerpo}
                      </p>
                    )}
                    {content.youtube_url && (
                      <p className="mt-1 truncate font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {content.youtube_url}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {content.youtube_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewContent(content)}
                      >
                        Previsualizar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingContentId(content.id);
                        setContentForm({
                          module_id: content.module_id,
                          titulo: content.titulo,
                          cuerpo: content.cuerpo || '',
                          youtube_url: content.youtube_url || '',
                          orden: String(content.orden),
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleSoftDeleteContent(content)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {previewContent && (
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">
              Vista previa de recurso multimedia
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewContent(null)}
            >
              Cerrar vista previa
            </Button>
          </div>
          <VideoPlayer
            key={previewContent.id}
            url={previewContent.youtube_url || ''}
            title={previewContent.titulo}
            moduleName="Vista previa docente"
          />
        </section>
      )}

      {/* Crear nuevo curso asignado */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Nuevo curso
        </p>
        <h3 className="mt-1 text-xl font-black text-foreground">
          Registrar nuevo curso bajo tu cátedra
        </h3>
        <form
          onSubmit={handleCreateCourse}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <Input
            label="Título del curso"
            value={courseForm.titulo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, titulo: e.target.value }))
            }
            placeholder="Ej. Arquitectura de Software"
            required
          />
          <Input
            label="Código de asignación"
            value={courseForm.codigo_asignacion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({
                ...prev,
                codigo_asignacion: e.target.value.toUpperCase(),
              }))
            }
            placeholder="Auto si queda vacío"
          />
          <Input
            label="Descripción"
            value={courseForm.descripcion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, descripcion: e.target.value }))
            }
            placeholder="Describe el alcance y competencias del curso"
            required
          />
          <Input
            label="URL de portada (Thumbnail)"
            type="url"
            value={courseForm.thumbnail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCourseForm((prev) => ({ ...prev, thumbnail: e.target.value }))
            }
            placeholder="https://..."
          />
          <div className="md:col-span-2">
            <Button type="submit" variant="brand" isLoading={isSaving}>
              Publicar Nuevo Curso
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

// =====================================================================
// Módulo 5 (instructor): Evaluaciones, Tareas y Calificación de Entregas
// =====================================================================

function InstructorEvaluationsModule({
  courses,
  modules,
  assignments,
  exams,
  assignmentSubmissions,
  examSubmissions,
  studentsMap,
  focusedAssignmentId,
  onReloadAcademic,
  onFeedback,
}: {
  courses: CourseRecord[];
  modules: ModuleRecord[];
  assignments: AssignmentRecord[];
  exams: ExamRecord[];
  assignmentSubmissions: AssignmentSubmissionRecord[];
  examSubmissions: ExamSubmissionRecord[];
  studentsMap: Map<string, UserProfile>;
  focusedAssignmentId: string | null;
  onReloadAcademic: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>('');

  const [assignmentForm, setAssignmentForm] = useState({
    module_id: '',
    titulo: '',
    descripcion: '',
    fecha_limite: '',
    punteo_maximo: '100',
  });

  const [examForm, setExamForm] = useState({
    module_id: '',
    titulo: '',
    tipo: 'parcial' as ExamType,
    modalidad: 'presencial' as ExamModality,
    fecha_apertura: '',
    fecha_cierre: '',
    punteo_maximo: '100',
  });

  const effectiveAssignmentFilter =
    selectedAssignmentFilter || focusedAssignmentId || 'all';
  const effectiveAssignmentModuleId =
    assignmentForm.module_id || modules[0]?.id || '';
  const effectiveExamModuleId =
    examForm.module_id || modules[0]?.id || '';

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleRecord>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseRecord>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignmentRecord>();
    assignments.forEach((a) => map.set(a.id, a));
    return map;
  }, [assignments]);

  const examMap = useMemo(() => {
    const map = new Map<string, ExamRecord>();
    exams.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [exams]);

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveAssignmentModuleId || !assignmentForm.fecha_limite) {
      onFeedback({
        type: 'error',
        message: 'Selecciona módulo y fecha límite para la tarea.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: effectiveAssignmentModuleId,
        titulo: assignmentForm.titulo.trim(),
        descripcion: assignmentForm.descripcion.trim(),
        fecha_limite: new Date(assignmentForm.fecha_limite).toISOString(),
        punteo_maximo: Number(assignmentForm.punteo_maximo) || 100,
      };

      const { error } = await supabase.from('assignments').insert([payload]);
      if (error) throw new Error(error.message);

      setAssignmentForm((prev) => ({
        ...prev,
        titulo: '',
        descripcion: '',
        fecha_limite: '',
        punteo_maximo: '100',
      }));
      onFeedback({
        type: 'success',
        message: `Tarea "${payload.titulo}" creada correctamente.`,
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear la tarea.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !effectiveExamModuleId ||
      !examForm.fecha_apertura ||
      !examForm.fecha_cierre
    ) {
      onFeedback({
        type: 'error',
        message: 'Selecciona módulo, apertura y cierre para la evaluación.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        module_id: effectiveExamModuleId,
        titulo: examForm.titulo.trim(),
        tipo: examForm.tipo,
        modalidad: examForm.modalidad,
        fecha_apertura: new Date(examForm.fecha_apertura).toISOString(),
        fecha_cierre: new Date(examForm.fecha_cierre).toISOString(),
        punteo_maximo: Number(examForm.punteo_maximo) || 100,
      };

      const { error } = await supabase.from('exams').insert([payload]);
      if (error) throw new Error(error.message);

      setExamForm((prev) => ({
        ...prev,
        titulo: '',
        fecha_apertura: '',
        fecha_cierre: '',
        punteo_maximo: '100',
      }));
      onFeedback({
        type: 'success',
        message: `Evaluación "${payload.titulo}" creada correctamente.`,
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el examen.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeAssignment = async (submission: AssignmentSubmissionRecord) => {
    const parentAssignment = assignmentMap.get(submission.assignment_id);
    const maxPoints = Number(parentAssignment?.punteo_maximo ?? 100);
    const rawScore =
      gradeInputs[submission.id] ?? String(submission.calificacion ?? '');
    const numericScore = Number(rawScore);

    if (
      rawScore.trim() === '' ||
      Number.isNaN(numericScore) ||
      numericScore < 0 ||
      numericScore > maxPoints
    ) {
      onFeedback({
        type: 'error',
        message: `Ingresa una calificación válida entre 0 y ${maxPoints}.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          calificacion: numericScore,
          calificado_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: 'Calificación registrada correctamente.',
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la calificación.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleExamAttendance = async (submission: ExamSubmissionRecord) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('exam_submissions')
        .update({ asistencia_verificada: !submission.asistencia_verificada })
        .eq('id', submission.id);

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: 'Estado de asistencia NFC actualizado.',
      });
      await onReloadAcademic();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la asistencia NFC.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (effectiveAssignmentFilter === 'all') return assignmentSubmissions;
    return assignmentSubmissions.filter(
      (item) => item.assignment_id === effectiveAssignmentFilter
    );
  }, [assignmentSubmissions, effectiveAssignmentFilter]);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Creación de Tareas */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Nueva tarea (`assignments`)
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">
            Publicar tarea o proyecto
          </h2>

          <form onSubmit={handleCreateAssignment} className="mt-4 space-y-3">
            <Select
              label="Módulo"
              value={effectiveAssignmentModuleId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  module_id: e.target.value,
                }))
              }
              placeholder="Selecciona módulo"
              options={modules.map((m) => ({
                value: m.id,
                label: `${courseMap.get(m.course_id)?.titulo || 'Curso'} · ${m.titulo}`,
              }))}
              required
            />
            <Input
              label="Título de la tarea"
              value={assignmentForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAssignmentForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Práctica 2: Normalización de BD"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Instrucciones <span className="ml-1 font-bold text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={assignmentForm.descripcion}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Describe el entregable esperado, formato y rúbrica."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Fecha límite"
                type="datetime-local"
                value={assignmentForm.fecha_limite}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    fecha_limite: e.target.value,
                  }))
                }
                required
              />
              <Input
                label="Punteo máximo"
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={assignmentForm.punteo_maximo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    punteo_maximo: e.target.value,
                  }))
                }
                required
              />
            </div>
            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Publicar Tarea
            </Button>
          </form>
        </section>

        {/* Creación de Exámenes */}
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Nueva evaluación (`exams`)
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">
            Programar examen parcial o final
          </h2>

          <form onSubmit={handleCreateExam} className="mt-4 space-y-3">
            <Select
              label="Módulo"
              value={effectiveExamModuleId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setExamForm((prev) => ({ ...prev, module_id: e.target.value }))
              }
              placeholder="Selecciona módulo"
              options={modules.map((m) => ({
                value: m.id,
                label: `${courseMap.get(m.course_id)?.titulo || 'Curso'} · ${m.titulo}`,
              }))}
              required
            />
            <Input
              label="Título del examen"
              value={examForm.titulo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setExamForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
              placeholder="Ej. Primer Parcial Presencial"
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Tipo"
                value={examForm.tipo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    tipo: e.target.value as ExamType,
                  }))
                }
                options={[
                  { value: 'parcial', label: 'Parcial' },
                  { value: 'final', label: 'Final' },
                ]}
              />
              <Select
                label="Modalidad"
                value={examForm.modalidad}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    modalidad: e.target.value as ExamModality,
                  }))
                }
                options={[
                  { value: 'presencial', label: 'Presencial (NFC)' },
                  { value: 'virtual', label: 'Virtual' },
                ]}
              />
              <Input
                label="Punteo máx."
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={examForm.punteo_maximo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    punteo_maximo: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Fecha apertura"
                type="datetime-local"
                value={examForm.fecha_apertura}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    fecha_apertura: e.target.value,
                  }))
                }
                required
              />
              <Input
                label="Fecha cierre"
                type="datetime-local"
                value={examForm.fecha_cierre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExamForm((prev) => ({
                    ...prev,
                    fecha_cierre: e.target.value,
                  }))
                }
                required
              />
            </div>
            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Programar Evaluación
            </Button>
          </form>
        </section>
      </div>

      {/* Catálogo de Tareas y Exámenes publicados */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-black text-foreground">
              Tareas activas ({assignments.length})
            </h3>
            <div className="mt-4 space-y-3">
              {assignments.map((task) => {
                const mod = moduleMap.get(task.module_id);
                return (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-brand">
                        {mod?.titulo || 'Módulo'}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {task.punteo_maximo} pts
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-foreground">
                      <Link
                        href={maskRoute(
                          `/dashboard?tab=evaluations&assignment=${encodeId(task.id)}`
                        )}
                        onClick={() => setSelectedAssignmentFilter(task.id)}
                        className="hover:text-brand hover:underline"
                      >
                        {task.titulo}
                      </Link>
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Límite: {formatDateTime(task.fecha_limite)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-foreground">
              Exámenes programados ({exams.length})
            </h3>
            <div className="mt-4 space-y-3">
              {exams.map((exam) => {
                const mod = moduleMap.get(exam.module_id);
                return (
                  <article
                    key={exam.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-brand">
                        {exam.tipo} · {exam.modalidad}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {exam.punteo_maximo} pts
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-foreground">
                      {exam.titulo}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {mod?.titulo || 'Módulo'} · Cierre: {formatDateTime(exam.fecha_cierre)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Revisión y Calificación de Entregas */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Revisión académica
            </p>
            <h3 className="mt-1 text-2xl font-black text-foreground">
              Entregas de estudiantes ({filteredSubmissions.length})
            </h3>
          </div>

          <div className="w-full sm:w-72">
            <Select
              label="Filtrar por tarea"
              value={effectiveAssignmentFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedAssignmentFilter(e.target.value)
              }
              options={[
                { value: 'all', label: 'Todas las tareas' },
                ...assignments.map((a) => ({ value: a.id, label: a.titulo })),
              ]}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Entrega y comentario</th>
                <th className="px-4 py-3">Calificación</th>
                <th className="px-4 py-3 text-right">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aún no se han recibido entregas de tareas para revisar.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => {
                  const student = studentsMap.get(submission.student_id);
                  const task = assignmentMap.get(submission.assignment_id);
                  const inputValue =
                    gradeInputs[submission.id] ??
                    (submission.calificacion !== null &&
                    submission.calificacion !== undefined
                      ? String(submission.calificacion)
                      : '');

                  return (
                    <tr key={submission.id}>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {student
                            ? `${student.nombres} ${student.apellidos}`
                            : encodeId(submission.student_id)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {student?.correo || 'Estudiante inscrito'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                        {task?.titulo || 'Tarea'}
                        <div className="text-[11px] font-normal text-slate-500">
                          Máx: {task?.punteo_maximo ?? 100} pts
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {submission.archivo_url ? (
                          <a
                            href={submission.archivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-brand hover:underline"
                          >
                            Abrir archivo entregado
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin archivo adjunto</span>
                        )}
                        {submission.comentario && (
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {submission.comentario}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={task?.punteo_maximo ?? 100}
                          value={inputValue}
                          onChange={(e) =>
                            setGradeInputs((prev) => ({
                              ...prev,
                              [submission.id]: e.target.value,
                            }))
                          }
                          placeholder="0 - 100"
                          className="w-24 rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-brand dark:border-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="brand"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleGradeAssignment(submission)}
                        >
                          Calificar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resultados de Exámenes */}
        <h3 className="mt-8 text-lg font-black text-foreground">
          Intentos de exámenes y validación NFC ({examSubmissions.length})
        </h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Examen</th>
                <th className="px-4 py-3">Nota automática</th>
                <th className="px-4 py-3">Asistencia NFC</th>
                <th className="px-4 py-3 text-right">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {examSubmissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Sin intentos de exámenes registrados todavía.
                  </td>
                </tr>
              ) : (
                examSubmissions.map((attempt) => {
                  const student = studentsMap.get(attempt.student_id);
                  const exam = examMap.get(attempt.exam_id);
                  return (
                    <tr key={attempt.id}>
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        {student
                          ? `${student.nombres} ${student.apellidos}`
                          : encodeId(attempt.student_id)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {exam?.titulo || 'Evaluación'} ({exam?.modalidad || 'virtual'})
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {attempt.calificacion_automatica} / {exam?.punteo_maximo ?? 100}
                      </td>
                      <td className="px-4 py-3.5">
                        {attempt.asistencia_verificada ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Verificada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleToggleExamAttendance(attempt)}
                        >
                          {attempt.asistencia_verificada
                            ? 'Revocar NFC'
                            : 'Validar NFC'}
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
    </div>
  );
}

// =====================================================================
// Módulo 6 (student): Mis Cursos, Progreso y Acceso a Lecciones
// =====================================================================

function StudentCoursesModule({
  currentUser,
  enrollments,
  modules,
  contents,
  selectedCourseId,
  selectedModuleId,
  onSelectCourse,
  onSelectModule,
  onReloadStudentData,
  onFeedback,
}: {
  currentUser: UserProfile;
  enrollments: EnrollmentRecord[];
  modules: ModuleRecord[];
  contents: ContentRecord[];
  selectedCourseId: string;
  selectedModuleId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string>('');
  const [completedContentIds, setCompletedContentIds] = useState<string[]>([]);

  const activeEnrollment = useMemo(
    () => enrollments.find((e) => e.course_id === selectedCourseId) || enrollments[0] || null,
    [enrollments, selectedCourseId]
  );

  const courseModules = useMemo(() => {
    if (!activeEnrollment) return [];
    return modules
      .filter((m) => m.course_id === activeEnrollment.course_id)
      .sort((a, b) => a.orden - b.orden);
  }, [modules, activeEnrollment]);

  const courseContents = useMemo(() => {
    const moduleOrderMap = new Map<string, number>();
    courseModules.forEach((m) => moduleOrderMap.set(m.id, m.orden));
    return contents
      .filter((c) => moduleOrderMap.has(c.module_id))
      .sort((a, b) => {
        const modDiff =
          (moduleOrderMap.get(a.module_id) ?? 0) -
          (moduleOrderMap.get(b.module_id) ?? 0);
        return modDiff !== 0 ? modDiff : a.orden - b.orden;
      });
  }, [contents, courseModules]);

  const visibleModuleContents = useMemo(() => {
    if (!selectedModuleId) return courseContents;
    return courseContents.filter((c) => c.module_id === selectedModuleId);
  }, [courseContents, selectedModuleId]);

  const activeContent = useMemo(
    () =>
      courseContents.find((c) => c.id === activeContentId) ||
      visibleModuleContents[0] ||
      courseContents[0] ||
      null,
    [courseContents, visibleModuleContents, activeContentId]
  );

  const activeModule = useMemo(
    () =>
      courseModules.find((m) => m.id === activeContent?.module_id) ||
      courseModules[0] ||
      null,
    [courseModules, activeContent]
  );

  const handleRedeemCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanCode = enrollmentCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsRedeeming(true);
    try {
      const { data: codeRow, error: codeError } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('codigo', cleanCode)
        .eq('tipo', 'course_enrollment')
        .eq('is_used', false)
        .eq('is_deleted', false)
        .maybeSingle();

      if (codeError) throw new Error(codeError.message);
      if (!codeRow || !codeRow.curso_id) {
        throw new Error(
          'Código de inscripción inválido, ya utilizado o sin curso asignado.'
        );
      }

      const { error: enrollError } = await supabase.from('enrollments').upsert(
        [
          {
            student_id: currentUser.id,
            course_id: codeRow.curso_id,
            progreso_porcentaje: 0,
            is_active: true,
            is_deleted: false,
          },
        ],
        { onConflict: 'student_id,course_id' }
      );

      if (enrollError) throw new Error(enrollError.message);

      await supabase
        .from('registration_codes')
        .update({ is_used: true, used_by: currentUser.id })
        .eq('id', codeRow.id);

      setEnrollmentCode('');
      onFeedback({
        type: 'success',
        message: 'Inscripción completada correctamente en el curso.',
      });
      await onReloadStudentData();
      onSelectCourse(codeRow.curso_id);
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo procesar el código de inscripción.',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleToggleLessonCompleted = async (nextCompleted: boolean) => {
    if (!activeContent || !activeEnrollment) return;

    const updatedSet = new Set(completedContentIds);
    if (nextCompleted) {
      updatedSet.add(activeContent.id);
    } else {
      updatedSet.delete(activeContent.id);
    }
    const nextArray = Array.from(updatedSet);
    setCompletedContentIds(nextArray);

    const totalLessons = Math.max(courseContents.length, 1);
    const completedInCourse = courseContents.filter((c) =>
      updatedSet.has(c.id)
    ).length;
    const computedProgress = Math.min(
      100,
      Math.max(
        nextCompleted ? Math.round((completedInCourse / totalLessons) * 100) : 0,
        nextCompleted ? activeEnrollment.progreso_porcentaje : 0
      )
    );
    const finalProgress =
      completedInCourse > 0
        ? Math.round((completedInCourse / totalLessons) * 100)
        : nextCompleted
        ? 100
        : computedProgress;

    const { error } = await supabase
      .from('enrollments')
      .update({ progreso_porcentaje: finalProgress })
      .eq('id', activeEnrollment.id);

    if (error) {
      onFeedback({
        type: 'error',
        message: `No se pudo actualizar tu progreso: ${error.message}`,
      });
      return;
    }

    onFeedback({
      type: 'success',
      message: `Progreso actualizado al ${finalProgress}% en ${
        activeEnrollment.courses?.titulo || 'tu curso'
      }.`,
    });
    await onReloadStudentData();
  };

  const currentIndex = activeContent
    ? courseContents.findIndex((c) => c.id === activeContent.id)
    : -1;

  return (
    <div className="space-y-8">
      {/* Canje rápido de código de inscripción */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Inscripciones activas (`enrollments`)
            </p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              Mis cursos inscritos ({enrollments.length})
            </h2>
          </div>

          <form
            onSubmit={handleRedeemCode}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <Input
              label="Código de inscripción a curso"
              value={enrollmentCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEnrollmentCode(e.target.value.toUpperCase())
              }
              placeholder="UMG-CRS-XXXXXXXX"
            />
            <Button type="submit" variant="brand" isLoading={isRedeeming}>
              Canjear código
            </Button>
          </form>
        </div>

        {enrollments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-foreground">
              Aún no tienes inscripciones activas
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Canjea un código de inscripción emitido por administración o explora el catálogo institucional.
            </p>
            <div className="mt-4">
              <Button href={maskRoute('/courses')} variant="brand">
                Explorar catálogo de cursos
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses;
              const courseId = enrollment.course_id;
              const courseModulesCount = modules.filter(
                (m) => m.course_id === courseId
              ).length;
              const courseLessonsCount = contents.filter((c) =>
                modules.some((m) => m.course_id === courseId && m.id === c.module_id)
              ).length;

              return (
                <div key={enrollment.id} className="space-y-3">
                  <CourseCard
                    course={{
                      id: courseId,
                      title: course?.titulo || 'Curso UMG',
                      description:
                        course?.descripcion ||
                        'Curso académico activo en Campus Cobán.',
                      thumbnail: course?.thumbnail || null,
                      category: 'Campus Cobán',
                      level: `${courseModulesCount} módulos`,
                      duration: `Nota: ${enrollment.calificacion_final ?? 0}`,
                      lessonsCount: courseLessonsCount,
                      rating: 5.0,
                      reviewsCount: 0,
                      instructor: {
                        name: 'Docente UMG',
                        avatar: null,
                        title: course?.codigo_asignacion || 'Curso Activo',
                      },
                    }}
                    progress={enrollment.progreso_porcentaje}
                    isEnrolled
                    actionText="Ver detalles del curso"
                    actionHref={createMaskedUrl('/courses', courseId)}
                  />
                  <Button
                    variant={
                      activeEnrollment?.course_id === courseId
                        ? 'success'
                        : 'secondary'
                    }
                    fullWidth
                    size="sm"
                    onClick={() => {
                      onSelectCourse(courseId);
                      onSelectModule('');
                      setActiveContentId('');
                    }}
                  >
                    {activeEnrollment?.course_id === courseId
                      ? 'Aula abierta abajo'
                      : 'Abrir lecciones en panel'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visor de Módulos y Lecciones del Curso Seleccionado */}
      {activeEnrollment && (
        <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Aula virtual · Progreso {activeEnrollment.progreso_porcentaje}%
              </p>
              <h3 className="mt-1 text-2xl font-black text-foreground">
                {activeEnrollment.courses?.titulo || 'Contenido del curso'}
              </h3>
            </div>
            <Button
              href={maskRoute(`/courses/${activeEnrollment.course_id}`)}
              variant="secondary"
              size="sm"
            >
              Ficha del curso
            </Button>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
              {courseModules.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  El docente aún no ha publicado módulos para este curso.
                </p>
              ) : (
                courseModules.map((mod) => {
                  const modContents = courseContents.filter(
                    (c) => c.module_id === mod.id
                  );
                  return (
                    <div
                      key={mod.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={maskRoute(
                            `/dashboard?tab=my-courses&course=${encodeId(
                              activeEnrollment.course_id
                            )}&module=${encodeId(mod.id)}`
                          )}
                          onClick={() => onSelectModule(mod.id)}
                          className="text-xs font-bold uppercase tracking-wider text-brand hover:underline"
                        >
                          Módulo {mod.orden}: {mod.titulo}
                        </Link>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {modContents.map((lesson) => {
                          const isCurrent = activeContent?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => setActiveContentId(lesson.id)}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                isCurrent
                                  ? 'bg-brand text-white'
                                  : 'bg-surface text-foreground hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                              }`}
                            >
                              <span className="truncate">
                                {lesson.orden}. {lesson.titulo}
                              </span>
                              {completedContentIds.includes(lesson.id) && (
                                <span>✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </aside>

            <div className="space-y-4">
              {activeContent ? (
                <>
                  <VideoPlayer
                    key={activeContent.id}
                    url={activeContent.youtube_url || ''}
                    title={activeContent.titulo}
                    moduleName={activeModule?.titulo}
                    isCompleted={completedContentIds.includes(activeContent.id)}
                    onComplete={handleToggleLessonCompleted}
                    onPrev={
                      currentIndex > 0
                        ? () =>
                            setActiveContentId(courseContents[currentIndex - 1].id)
                        : undefined
                    }
                    onNext={
                      currentIndex >= 0 &&
                      currentIndex < courseContents.length - 1
                        ? () =>
                            setActiveContentId(courseContents[currentIndex + 1].id)
                        : undefined
                    }
                  />
                  {activeContent.cuerpo && (
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                      <h4 className="text-sm font-bold text-foreground">
                        Notas y recursos de la lección
                      </h4>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {activeContent.cuerpo}
                      </p>
                      {extractResourceLinks(activeContent.cuerpo).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {extractResourceLinks(activeContent.cuerpo).map(
                            (resourceUrl) => (
                              <a
                                key={resourceUrl}
                                href={resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:underline dark:bg-blue-500/10 dark:text-blue-300"
                              >
                                Abrir recurso externo
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </article>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Selecciona una lección para iniciar la reproducción y registrar tu avance.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// =====================================================================
// Módulo 7 (student): Tareas, Entregas y Exámenes con NFC
// =====================================================================

function StudentTasksExamsModule({
  currentUser,
  modules,
  assignments,
  exams,
  assignmentSubmissions,
  examSubmissions,
  coursesMap,
  focusedAssignmentId,
  onReloadStudentData,
  onFeedback,
}: {
  currentUser: UserProfile;
  modules: ModuleRecord[];
  assignments: AssignmentRecord[];
  exams: ExamRecord[];
  assignmentSubmissions: AssignmentSubmissionRecord[];
  examSubmissions: ExamSubmissionRecord[];
  coursesMap: Map<string, CourseRecord>;
  focusedAssignmentId: string | null;
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null
  );
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para examen y verificación NFC
  const [activeExam, setActiveExam] = useState<ExamRecord | null>(null);
  const [nfcTokenInput, setNfcTokenInput] = useState('');
  const [nfcVerifiedForExam, setNfcVerifiedForExam] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const activeAssignmentId =
    selectedAssignmentId !== null
      ? selectedAssignmentId
      : focusedAssignmentId || '';

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleRecord>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentSubmissionRecord>();
    assignmentSubmissions.forEach((s) => map.set(s.assignment_id, s));
    return map;
  }, [assignmentSubmissions]);

  const submissionByExam = useMemo(() => {
    const map = new Map<string, ExamSubmissionRecord>();
    examSubmissions.forEach((s) => map.set(s.exam_id, s));
    return map;
  }, [examSubmissions]);

  const handleUploadAndSubmitTask = async (
    e: React.FormEvent<HTMLFormElement>,
    assignment: AssignmentRecord
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalFileUrl = submissionUrl.trim();

      if (selectedFile) {
        const storagePath = buildSubmissionStoragePath(
          currentUser.id,
          assignment.id,
          selectedFile.name
        );
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(storagePath, selectedFile, { upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('submissions')
            .getPublicUrl(storagePath);
          finalFileUrl = publicData.publicUrl;
        } else if (!finalFileUrl) {
          finalFileUrl = `storage://submissions/${storagePath}`;
        }
      }

      if (!finalFileUrl) {
        onFeedback({
          type: 'error',
          message: 'Adjunta un archivo o proporciona el enlace de tu entrega.',
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('assignment_submissions').upsert(
        [
          {
            assignment_id: assignment.id,
            student_id: currentUser.id,
            archivo_url: finalFileUrl,
            comentario: submissionComment.trim() || null,
          },
        ],
        { onConflict: 'assignment_id,student_id' }
      );

      if (error) throw new Error(error.message);

      setSelectedFile(null);
      setSubmissionUrl('');
      setSubmissionComment('');
      setSelectedAssignmentId('');
      onFeedback({
        type: 'success',
        message: `Entrega registrada para "${assignment.titulo}".`,
      });
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Error al enviar la tarea.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyNfc = async (exam: ExamRecord) => {
    const cleanInput = nfcTokenInput.trim();
    const expectedHash = currentUser.nfc_token_hash;

    if (!cleanInput) {
      onFeedback({
        type: 'error',
        message: 'Ingresa o escanea tu código/token NFC de carné universitario.',
      });
      return;
    }

    if (expectedHash && cleanInput !== expectedHash) {
      onFeedback({
        type: 'error',
        message:
          'El token NFC no coincide con la credencial vinculada a tu perfil institucional.',
      });
      return;
    }

    setNfcVerifiedForExam((prev) => ({ ...prev, [exam.id]: true }));
    onFeedback({
      type: 'success',
      message: 'Asistencia presencial NFC validada. Ya puedes resolver tu examen.',
    });
  };

  const handleSubmitExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeExam) return;

    const isPresencial = activeExam.modalidad === 'presencial';
    const isVerified = isPresencial
      ? Boolean(nfcVerifiedForExam[activeExam.id])
      : true;

    if (isPresencial && !isVerified) {
      onFeedback({
        type: 'error',
        message: 'Debes validar tu asistencia NFC antes de enviar un examen presencial.',
      });
      return;
    }

    const correctCount = SAMPLE_QUESTIONS.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);

    const maxScore = Number(activeExam.punteo_maximo) || 100;
    const computedScore = Number(
      ((correctCount / SAMPLE_QUESTIONS.length) * maxScore).toFixed(2)
    );

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('exam_submissions').upsert(
        [
          {
            exam_id: activeExam.id,
            student_id: currentUser.id,
            calificacion_automatica: computedScore,
            asistencia_verificada: isVerified,
          },
        ],
        { onConflict: 'exam_id,student_id' }
      );

      if (error) throw new Error(error.message);

      onFeedback({
        type: 'success',
        message: `Examen enviado. Calificación automática: ${computedScore} / ${maxScore}.`,
      });
      setActiveExam(null);
      setAnswers({});
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo enviar el examen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tareas Pendientes y Entregas */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Entregas académicas (`assignments`)
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Mis tareas ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            No tienes tareas asignadas en tus cursos inscritos por el momento.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {assignments.map((task) => {
              const mod = moduleMap.get(task.module_id);
              const course = mod ? coursesMap.get(mod.course_id) : undefined;
              const existing = submissionByAssignment.get(task.id);
              const isOpen = activeAssignmentId === task.id;

              return (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-brand">
                      {course?.titulo || 'Curso'} · {mod?.titulo || 'Módulo'}
                    </span>
                    {existing?.calificacion !== null &&
                    existing?.calificacion !== undefined ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Nota: {existing.calificacion} / {task.punteo_maximo}
                      </span>
                    ) : existing ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        Entregada
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-bold text-foreground">
                    <Link
                      href={maskRoute(
                        `/dashboard?tab=tasks-exams&assignment=${encodeId(task.id)}`
                      )}
                      onClick={() => setSelectedAssignmentId(task.id)}
                      className="hover:text-brand hover:underline"
                    >
                      {task.titulo}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {task.descripcion}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Fecha límite: {formatDateTime(task.fecha_limite)} · Valor: {task.punteo_maximo} pts
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={isOpen ? 'ghost' : 'brand'}
                      size="sm"
                      onClick={() =>
                        setSelectedAssignmentId(isOpen ? '' : task.id)
                      }
                    >
                      {isOpen
                        ? 'Cerrar formulario'
                        : existing
                        ? 'Actualizar entrega'
                        : 'Subir entrega'}
                    </Button>
                  </div>

                  {isOpen && (
                    <form
                      onSubmit={(e) => handleUploadAndSubmitTask(e, task)}
                      className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Archivo de entrega (PDF, ZIP, DOCX)
                        </label>
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-xs text-foreground dark:border-slate-700"
                        />
                      </div>

                      <Input
                        label="O enlace directo al archivo / repositorio"
                        type="url"
                        value={submissionUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubmissionUrl(e.target.value)
                        }
                        placeholder="https://drive.google.com/... o GitHub"
                      />

                      <Input
                        label="Comentario para el docente"
                        value={submissionComment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubmissionComment(e.target.value)
                        }
                        placeholder="Notas sobre la entrega"
                      />

                      <Button
                        type="submit"
                        variant="brand"
                        size="sm"
                        isLoading={isSubmitting}
                      >
                        Enviar Tarea
                      </Button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Exámenes y Validación NFC */}
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Evaluaciones (`exams` y `exam_submissions`)
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Exámenes disponibles ({exams.length})
        </h2>

        {exams.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            No hay exámenes programados en tus cursos inscritos.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {exams.map((exam) => {
              const mod = moduleMap.get(exam.module_id);
              const existing = submissionByExam.get(exam.id);
              const isPresencial = exam.modalidad === 'presencial';

              return (
                <article
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {exam.tipo} · {exam.modalidad}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {exam.punteo_maximo} pts
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-foreground">
                    {exam.titulo}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {mod?.titulo || 'Módulo'} · Cierre: {formatDateTime(exam.fecha_cierre)}
                  </p>

                  {existing ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Nota obtenida: {existing.calificacion_automatica} / {exam.punteo_maximo} ·{' '}
                      Asistencia NFC:{' '}
                      {existing.asistencia_verificada ? 'Verificada' : 'Virtual'}
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {isPresencial
                          ? 'Requiere verificación NFC en laboratorio'
                          : 'Modalidad virtual habilitada'}
                      </span>
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => {
                          setActiveExam(exam);
                          setAnswers({});
                        }}
                      >
                        Resolver examen
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {activeExam && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-6 dark:border-blue-500/20 dark:from-blue-950/40 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  Evaluación en curso · {activeExam.modalidad}
                </p>
                <h3 className="text-xl font-black text-foreground">
                  {activeExam.titulo}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveExam(null)}
              >
                Cancelar
              </Button>
            </div>

            {activeExam.modalidad === 'presencial' &&
            !nfcVerifiedForExam[activeExam.id] ? (
              <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-surface p-5 dark:border-slate-800">
                <h4 className="text-sm font-bold text-foreground">
                  Verificación de Asistencia NFC Requerida
                </h4>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Acerca tu carné universitario NFC al lector del laboratorio o ingresa el token NFC asignado a tu perfil ({currentUser.nfc_token_hash ? 'Credencial vinculada' : 'Validación de aula'}).
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Input
                    label="Token / UID Credencial NFC"
                    value={nfcTokenInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNfcTokenInput(e.target.value)
                    }
                    placeholder={
                      currentUser.nfc_token_hash || 'NFC-UMG-COBAN-...'
                    }
                  />
                  <Button
                    variant="brand"
                    onClick={() => handleVerifyNfc(activeExam)}
                  >
                    Validar Asistencia NFC
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitExam} className="mt-5 space-y-4">
                {SAMPLE_QUESTIONS.map((q, index) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-slate-800"
                  >
                    <p className="text-sm font-bold text-foreground">
                      {index + 1}. {q.prompt}
                    </p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === optIndex}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: optIndex,
                              }))
                            }
                            required
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button type="submit" variant="brand" isLoading={isSubmitting}>
                  Finalizar y Enviar Evaluación
                </Button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// =====================================================================
// Módulo 8 (student): Reseñas de Cursos Finalizados
// =====================================================================

function StudentReviewsModule({
  currentUser,
  enrollments,
  reviews,
  onReloadStudentData,
  onFeedback,
}: {
  currentUser: UserProfile;
  enrollments: EnrollmentRecord[];
  reviews: CourseReviewRecord[];
  onReloadStudentData: () => Promise<void>;
  onFeedback: (feedback: StatusFeedback) => void;
}) {
  const finishedEnrollments = useMemo(
    () =>
      enrollments.filter(
        (e) =>
          e.progreso_porcentaje >= 100 || Number(e.calificacion_final ?? 0) > 0
      ),
    [enrollments]
  );

  const [courseId, setCourseId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [comentario, setComentario] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const effectiveCourseId = courseId || finishedEnrollments[0]?.course_id || '';

  const courseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    enrollments.forEach((e) => {
      if (e.courses?.titulo) map.set(e.course_id, e.courses.titulo);
    });
    return map;
  }, [enrollments]);

  const handleSaveReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCourseId) {
      onFeedback({
        type: 'error',
        message: 'Completa un curso al 100% para habilitar la reseña.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('course_reviews').upsert(
        [
          {
            course_id: effectiveCourseId,
            student_id: currentUser.id,
            rating,
            comentario: comentario.trim() || null,
            is_deleted: false,
          },
        ],
        { onConflict: 'course_id,student_id' }
      );

      if (error) throw new Error(error.message);

      setComentario('');
      onFeedback({
        type: 'success',
        message: 'Tu reseña académica fue guardada correctamente.',
      });
      await onReloadStudentData();
    } catch (err: unknown) {
      onFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo guardar la reseña.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Calificación de cursos (`course_reviews`)
        </p>
        <h2 className="mt-1 text-xl font-black text-foreground">
          Publicar reseña de curso finalizado
        </h2>

        {finishedEnrollments.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Completa al 100% las lecciones de alguno de tus cursos inscritos en la pestaña &quot;Mis Cursos&quot; para desbloquear la calificación por estrellas.
          </p>
        ) : (
          <form onSubmit={handleSaveReview} className="mt-5 space-y-4">
            <Select
              label="Curso finalizado"
              value={effectiveCourseId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setCourseId(e.target.value)
              }
              options={finishedEnrollments.map((e) => ({
                value: e.course_id,
                label: e.courses?.titulo || 'Curso finalizado',
              }))}
              required
            />

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Calificación (1 a 5 estrellas)
              </span>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star} estrellas`}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-all ${
                      star <= rating
                        ? 'border-amber-400 bg-amber-50 text-amber-500 dark:border-amber-500/50 dark:bg-amber-500/10'
                        : 'border-slate-200 bg-surface text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-foreground">
                  {rating}.0 / 5
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Comentario sobre el curso
              </label>
              <textarea
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comparte tu experiencia con las lecciones, evaluaciones y acompañamiento docente."
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700"
              />
            </div>

            <Button type="submit" variant="brand" fullWidth isLoading={isSaving}>
              Guardar Reseña
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-surface p-6 shadow-sm dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Historial de opiniones
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">
          Mis reseñas enviadas ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            Aún no has enviado reseñas para tus cursos finalizados.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {reviews.map((rev) => (
              <article
                key={rev.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={maskRoute(`/courses/${rev.course_id}`)}
                    className="text-sm font-bold text-foreground hover:text-brand hover:underline"
                  >
                    {courseNameMap.get(rev.course_id) || 'Curso UMG'}
                  </Link>
                  <span className="text-sm font-bold text-amber-500">
                    {'★'.repeat(rev.rating)}
                    <span className="text-slate-300 dark:text-slate-600">
                      {'★'.repeat(5 - rev.rating)}
                    </span>
                  </span>
                </div>
                {rev.comentario && (
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {rev.comentario}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{formatDateTime(rev.created_at)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCourseId(rev.course_id);
                      setRating(rev.rating);
                      setComentario(rev.comentario || '');
                    }}
                  >
                    Editar reseña
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

// =====================================================================
// Módulo Universal: Editar Datos de Perfil (users)
// =====================================================================

interface UserProfileEditModuleProps {
  currentUser: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onFeedback: (fb: StatusFeedback) => void;
}

function UserProfileEditModule({
  currentUser,
  onProfileUpdated,
  onFeedback,
}: UserProfileEditModuleProps) {
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

// =====================================================================
// Módulo de Seguridad y Contraseña (supabase.auth.updateUser)
// =====================================================================

interface UserSecurityModuleProps {
  currentUser: UserProfile;
  onFeedback: (fb: StatusFeedback) => void;
}

function UserSecurityModule({
  currentUser,
  onFeedback,
}: UserSecurityModuleProps) {
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

// =====================================================================
// Componente Principal del Dashboard Institucional
// =====================================================================

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [feedback, setFeedback] = useState<StatusFeedback | null>(null);
  const [sessionError, setSessionError] = useState<string>('');

  // Estados compartidos / administrativos
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [codesList, setCodesList] = useState<RegistrationCodeRecord[]>([]);
  const [allCourses, setAllCourses] = useState<CourseRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [softDeletedItems, setSoftDeletedItems] = useState<SoftDeletedItem[]>([]);

  // Estados académicos (instructor y estudiante)
  const [instructorCourses, setInstructorCourses] = useState<CourseRecord[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<EnrollmentRecord[]>([]);
  const [modulesList, setModulesList] = useState<ModuleRecord[]>([]);
  const [contentsList, setContentsList] = useState<ContentRecord[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentRecord[]>([]);
  const [examsList, setExamsList] = useState<ExamRecord[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<
    AssignmentSubmissionRecord[]
  >([]);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmissionRecord[]>([]);
  const [studentReviews, setStudentReviews] = useState<CourseReviewRecord[]>([]);

  // Enfoque desde rutas enmascaradas Anti-IDOR
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [focusedAssignmentId, setFocusedAssignmentId] = useState<string | null>(null);

  // Sincronización de parámetros enmascarados en URL
  const syncUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const courseHash = params.get('course');
    const moduleHash = params.get('module');
    const userHash = params.get('user');
    const assignmentHash = params.get('assignment');

    setActiveTab(tabParam || '');
    if (courseHash) {
      const decodedCourse = decodeId(courseHash);
      if (decodedCourse) setSelectedCourseId(decodedCourse);
    }
    if (moduleHash) {
      const decodedModule = decodeId(moduleHash);
      if (decodedModule) setSelectedModuleId(decodedModule);
    }
    if (userHash) {
      const decodedUser = decodeId(userHash);
      if (decodedUser) setFocusedUserId(decodedUser);
    }
    if (assignmentHash) {
      const decodedAssignment = decodeId(assignmentHash);
      if (decodedAssignment) setFocusedAssignmentId(decodedAssignment);
    }
  }, []);

  // Carga de datos específicos para system / administration
  const loadAdminModulesData = useCallback(async (role: UserRole) => {
    const [usersRes, codesRes, coursesRes] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('registration_codes')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('courses')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ]);

    if (usersRes.data) setUsersList(usersRes.data as UserProfile[]);
    if (codesRes.data) setCodesList(codesRes.data as RegistrationCodeRecord[]);
    if (coursesRes.data) setAllCourses(coursesRes.data as CourseRecord[]);

    if (role === 'system') {
      const [auditRes, delUsersRes, delCoursesRes, delCodesRes, delModulesRes] =
        await Promise.all([
          supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('users')
            .select('id, nombres, apellidos, correo, deleted_at, updated_at')
            .eq('is_deleted', true),
          supabase
            .from('courses')
            .select('id, titulo, codigo_asignacion, updated_at')
            .eq('is_deleted', true),
          supabase
            .from('registration_codes')
            .select('id, codigo, tipo, created_at')
            .eq('is_deleted', true),
          supabase
            .from('modules')
            .select('id, titulo, orden, created_at')
            .eq('is_deleted', true),
        ]);

      if (auditRes.data) setAuditLogs(auditRes.data as AuditLogRecord[]);

      const deleted: SoftDeletedItem[] = [];
      (delUsersRes.data || []).forEach((u) =>
        deleted.push({
          table: 'users',
          id: u.id,
          label: `${u.nombres} ${u.apellidos}`,
          detail: u.correo,
          timestamp: u.deleted_at || u.updated_at,
        })
      );
      (delCoursesRes.data || []).forEach((c) =>
        deleted.push({
          table: 'courses',
          id: c.id,
          label: c.titulo,
          detail: c.codigo_asignacion || 'Curso',
          timestamp: c.updated_at,
        })
      );
      (delCodesRes.data || []).forEach((rc) =>
        deleted.push({
          table: 'registration_codes',
          id: rc.id,
          label: rc.codigo,
          detail: `Tipo: ${rc.tipo}`,
          timestamp: rc.created_at,
        })
      );
      (delModulesRes.data || []).forEach((m) =>
        deleted.push({
          table: 'modules',
          id: m.id,
          label: m.titulo,
          detail: `Orden ${m.orden}`,
          timestamp: m.created_at,
        })
      );
      setSoftDeletedItems(deleted);
    }
  }, []);

  // Carga de datos específicos para instructor
  const loadInstructorData = useCallback(async (instructorId: string) => {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const ownedCourses = (coursesData || []) as CourseRecord[];
    setInstructorCourses(ownedCourses);
    setSelectedCourseId((prev) =>
      prev && ownedCourses.some((c) => c.id === prev)
        ? prev
        : ownedCourses[0]?.id || ''
    );

    const courseIds = ownedCourses.map((c) => c.id);
    if (courseIds.length === 0) {
      setModulesList([]);
      setContentsList([]);
      setAssignmentsList([]);
      setExamsList([]);
      setAssignmentSubmissions([]);
      setExamSubmissions([]);
      return;
    }

    const { data: modsData } = await supabase
      .from('modules')
      .select('*')
      .in('course_id', courseIds)
      .eq('is_deleted', false)
      .order('orden', { ascending: true });

    const mods = (modsData || []) as ModuleRecord[];
    setModulesList(mods);

    const modIds = mods.map((m) => m.id);
    if (modIds.length === 0) {
      setContentsList([]);
      setAssignmentsList([]);
      setExamsList([]);
      setAssignmentSubmissions([]);
      setExamSubmissions([]);
      return;
    }

    const [contentsRes, assignmentsRes, examsRes] = await Promise.all([
      supabase
        .from('contents')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('orden', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('fecha_limite', { ascending: true }),
      supabase
        .from('exams')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('fecha_apertura', { ascending: true }),
    ]);

    const loadedAssignments = (assignmentsRes.data || []) as AssignmentRecord[];
    const loadedExams = (examsRes.data || []) as ExamRecord[];

    setContentsList((contentsRes.data || []) as ContentRecord[]);
    setAssignmentsList(loadedAssignments);
    setExamsList(loadedExams);

    const assignmentIds = loadedAssignments.map((a) => a.id);
    const examIds = loadedExams.map((ex) => ex.id);

    const [assignSubRes, examSubRes] = await Promise.all([
      assignmentIds.length > 0
        ? supabase
            .from('assignment_submissions')
            .select('*')
            .in('assignment_id', assignmentIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      examIds.length > 0
        ? supabase
            .from('exam_submissions')
            .select('*')
            .in('exam_id', examIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const loadedAssignSubs = (assignSubRes.data || []) as AssignmentSubmissionRecord[];
    const loadedExamSubs = (examSubRes.data || []) as ExamSubmissionRecord[];
    setAssignmentSubmissions(loadedAssignSubs);
    setExamSubmissions(loadedExamSubs);

    const studentIds = Array.from(
      new Set([
        ...loadedAssignSubs.map((s) => s.student_id),
        ...loadedExamSubs.map((s) => s.student_id),
      ])
    );

    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('users')
        .select('*')
        .in('id', studentIds);
      if (studentsData) setUsersList(studentsData as UserProfile[]);
    }
  }, []);

  // Carga de datos específicos para student
  const loadStudentData = useCallback(async (studentId: string) => {
    const [enrollRes, reviewsRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('enrolled_at', { ascending: false }),
      supabase
        .from('course_reviews')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ]);

    const loadedEnrollments = (enrollRes.data || []) as EnrollmentRecord[];
    setStudentEnrollments(loadedEnrollments);
    setStudentReviews((reviewsRes.data || []) as CourseReviewRecord[]);
    setSelectedCourseId((prev) =>
      prev && loadedEnrollments.some((e) => e.course_id === prev)
        ? prev
        : loadedEnrollments[0]?.course_id || ''
    );

    const courseIds = loadedEnrollments.map((e) => e.course_id);
    if (courseIds.length === 0) {
      setModulesList([]);
      setContentsList([]);
      setAssignmentsList([]);
      setExamsList([]);
      setAssignmentSubmissions([]);
      setExamSubmissions([]);
      return;
    }

    const { data: modsData } = await supabase
      .from('modules')
      .select('*')
      .in('course_id', courseIds)
      .eq('is_deleted', false)
      .order('orden', { ascending: true });

    const mods = (modsData || []) as ModuleRecord[];
    setModulesList(mods);

    const modIds = mods.map((m) => m.id);
    if (modIds.length === 0) {
      setContentsList([]);
      setAssignmentsList([]);
      setExamsList([]);
      return;
    }

    const [
      contentsRes,
      assignmentsRes,
      examsRes,
      assignSubRes,
      examSubRes,
    ] = await Promise.all([
      supabase
        .from('contents')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('orden', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('fecha_limite', { ascending: true }),
      supabase
        .from('exams')
        .select('*')
        .in('module_id', modIds)
        .eq('is_deleted', false)
        .order('fecha_apertura', { ascending: true }),
      supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId),
      supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', studentId),
    ]);

    setContentsList((contentsRes.data || []) as ContentRecord[]);
    setAssignmentsList((assignmentsRes.data || []) as AssignmentRecord[]);
    setExamsList((examsRes.data || []) as ExamRecord[]);
    setAssignmentSubmissions(
      (assignSubRes.data || []) as AssignmentSubmissionRecord[]
    );
    setExamSubmissions((examSubRes.data || []) as ExamSubmissionRecord[]);
  }, []);

  // Carga inicial de sesión activa (auth.uid()) y perfil en tabla users
  const initializeSession = useCallback(async () => {
    try {
      const { data: userResponse, error: authError } =
        await supabase.auth.getUser();
      let authUser = userResponse?.user || null;

      if (!authUser) {
        const { data: sessionResponse } = await supabase.auth.getSession();
        authUser = sessionResponse?.session?.user || null;
      }

      syncUrlParams();
      setSessionError('');

      if (authError && !authUser) {
        setIsAuthenticated(false);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (!authUser) {
        setIsAuthenticated(false);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Consultar perfil completo en tabla users mediante auth.uid() (authUser.id)
      const { data: dbProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .eq('is_deleted', false)
        .maybeSingle();

      if (profileError) {
        setSessionError(
          `Error al consultar tu perfil en la tabla users: ${profileError.message}`
        );
      }

      if (!dbProfile) {
        setSessionError(
          'Tu cuenta autenticada no tiene un perfil activo en la tabla users, o las políticas RLS de Supabase no permiten leerlo (ver Policies_users.sql).'
        );
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const resolvedProfile = dbProfile as UserProfile;
      const exactRole: UserRole = isValidUserRole(resolvedProfile.rol)
        ? resolvedProfile.rol
        : 'student';

      const normalizedProfile: UserProfile = {
        ...resolvedProfile,
        rol: exactRole,
      };

      setProfile(normalizedProfile);

      const urlTab =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('tab')
          : null;
      const defaultTab = TABS_BY_ROLE[exactRole][0].id;
      setActiveTab((prev) => {
        const candidate = urlTab || prev;
        return TABS_BY_ROLE[exactRole].some((tab) => tab.id === candidate)
          ? candidate
          : defaultTab;
      });

      if (exactRole === 'system' || exactRole === 'administration') {
        await loadAdminModulesData(exactRole);
      } else if (exactRole === 'instructor') {
        await loadInstructorData(normalizedProfile.id);
      } else {
        await loadStudentData(normalizedProfile.id);
      }
    } catch (err: unknown) {
      setSessionError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al validar la sesión.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadAdminModulesData, loadInstructorData, loadStudentData, syncUrlParams]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      if (active) {
        void initializeSession();
      }
    }, 0);

    const onUrlChange = () => syncUrlParams();
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('lms:urlchange', onUrlChange);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void initializeSession();
    });

    return () => {
      active = false;
      window.clearTimeout(timerId);
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('lms:urlchange', onUrlChange);
      authListener.subscription.unsubscribe();
    };
  }, [initializeSession, syncUrlParams]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = maskRoute('/login');
    }
  };

  const studentsMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    usersList.forEach((u) => map.set(u.id, u));
    return map;
  }, [usersList]);

  const studentCoursesMap = useMemo(() => {
    const map = new Map<string, CourseRecord>();
    studentEnrollments.forEach((e) => {
      if (e.courses) map.set(e.course_id, e.courses);
    });
    return map;
  }, [studentEnrollments]);

  // Métricas KPI dinámicas por rol
  const roleMetrics = useMemo(() => {
    if (!profile) return [];

    if (profile.rol === 'system' || profile.rol === 'administration') {
      const availableCodes = codesList.filter((c) => !c.is_used).length;
      const items = [
        {
          label: 'Usuarios activos',
          value: String(usersList.length),
          detail: 'Estudiantes y colaboradores en BD',
        },
        {
          label: 'Códigos disponibles',
          value: String(availableCodes),
          detail: `${codesList.length} emitidos en total`,
        },
        {
          label: 'Cursos registrados',
          value: String(allCourses.length),
          detail: 'Campus Cobán activo',
        },
      ];
      if (profile.rol === 'system') {
        items.push({
          label: 'Eventos auditados',
          value: String(auditLogs.length),
          detail: `${softDeletedItems.length} borrados lógicos`,
        });
      }
      return items;
    }

    if (profile.rol === 'instructor') {
      const pendingToGrade = assignmentSubmissions.filter(
        (s) => s.calificacion === null || s.calificacion === undefined
      ).length;
      return [
        {
          label: 'Cursos asignados',
          value: String(instructorCourses.length),
          detail: 'Cátedras activas',
        },
        {
          label: 'Módulos y lecciones',
          value: `${modulesList.length} / ${contentsList.length}`,
          detail: 'Módulos / contenidos publicados',
        },
        {
          label: 'Entregas por calificar',
          value: String(pendingToGrade),
          detail: `${assignmentsList.length} tareas · ${examsList.length} exámenes`,
        },
      ];
    }

    const avgProgress =
      studentEnrollments.length > 0
        ? Math.round(
            studentEnrollments.reduce(
              (acc, item) => acc + item.progreso_porcentaje,
              0
            ) / studentEnrollments.length
          )
        : 0;
    const pendingTasks = assignmentsList.filter(
      (a) => !assignmentSubmissions.some((s) => s.assignment_id === a.id)
    ).length;

    return [
      {
        label: 'Cursos inscritos',
        value: String(studentEnrollments.length),
        detail: 'Inscripciones activas en enrollments',
      },
      {
        label: 'Avance promedio',
        value: `${avgProgress}%`,
        detail: 'Calculado sobre tus lecciones',
      },
      {
        label: 'Tareas pendientes',
        value: String(pendingTasks),
        detail: `${examsList.length} evaluaciones · ${studentReviews.length} reseñas`,
      },
    ];
  }, [
    profile,
    usersList.length,
    codesList,
    allCourses.length,
    auditLogs.length,
    softDeletedItems.length,
    instructorCourses.length,
    modulesList.length,
    contentsList.length,
    assignmentSubmissions,
    assignmentsList,
    examsList.length,
    studentEnrollments,
    studentReviews.length,
  ]);

  const roleMeta = profile ? ROLE_META[profile.rol] : null;
  const availableTabs = profile ? TABS_BY_ROLE[profile.rol] : [];
  const resolvedActiveTab =
    profile &&
    activeTab &&
    availableTabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : availableTabs[0]?.id || '';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar
        role={profile ? profile.rol : 'public'}
        user={
          profile
            ? {
                name: `${profile.nombres} ${profile.apellidos}`.trim(),
                role: profile.rol,
                avatar: profile.avatar,
              }
            : null
        }
        onLogout={handleLogout}
        currentPath={
          resolvedActiveTab
            ? maskRoute(`/dashboard?tab=${resolvedActiveTab}`)
            : maskRoute('/dashboard')
        }
      />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <section className="rounded-[30px] border border-slate-200 bg-surface p-10 text-center shadow-sm dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Validando sesión institucional y cargando módulos desde Supabase...
            </p>
          </section>
        ) : !isAuthenticated || !profile || !roleMeta ? (
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-[#0b2340] to-blue-900 p-8 text-white shadow-xl shadow-blue-950/10">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Acceso Institucional Protegido
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Inicia sesión para acceder a tu panel LMS UMG
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
                {sessionError ||
                  'Los módulos académicos, administrativos y de auditoría requieren una sesión autenticada en Supabase.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={maskRoute('/login')} variant="brand" size="md">
                  Iniciar Sesión
                </Button>
                <Button
                  href={maskRoute('/courses')}
                  variant="secondary"
                  size="md"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  Ver Catálogo Público
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Tarjetas KPI */}
            <section
              aria-label="Resumen institucional"
              className={`grid gap-4 ${
                roleMetrics.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
              }`}
            >
              {roleMetrics.map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-800"
                >
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.detail}
                  </p>
                </article>
              ))}
            </section>

            {/* Alertas globales de retroalimentación */}
            {feedback && (
              <div
                className={`mt-6 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                <span>{feedback.message}</span>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-xs font-bold underline"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Renderizado estricto por rol */}
            <div className="mt-8">
              {resolvedActiveTab === 'profile' && (
                <UserProfileEditModule
                  key={profile.updated_at || profile.id}
                  currentUser={profile}
                  onProfileUpdated={(updated) => {
                    setProfile(updated);
                    if (
                      updated.rol === 'system' ||
                      updated.rol === 'administration'
                    ) {
                      void loadAdminModulesData(updated.rol);
                    }
                  }}
                  onFeedback={setFeedback}
                />
              )}

              {resolvedActiveTab === 'security' && (
                <UserSecurityModule
                  key={`security-${profile.id}`}
                  currentUser={profile}
                  onFeedback={setFeedback}
                />
              )}

              {(profile.rol === 'system' || profile.rol === 'administration') && (
                <>
                  {resolvedActiveTab === 'users' && (
                    <AdminUsersModule
                      key={focusedUserId || 'users-module'}
                      currentUser={profile}
                      users={usersList}
                      focusedUserId={focusedUserId}
                      onReloadUsers={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'codes' && (
                    <RegistrationCodesModule
                      currentUser={profile}
                      codes={codesList}
                      courses={allCourses}
                      onReloadCodes={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {profile.rol === 'system' && resolvedActiveTab === 'audit' && (
                    <SystemAuditModule
                      currentUser={profile}
                      auditLogs={auditLogs}
                      softDeletedItems={softDeletedItems}
                      users={usersList}
                      onReloadAudit={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}

              {profile.rol === 'instructor' && (
                <>
                  {resolvedActiveTab === 'courses' && (
                    <InstructorCoursesModule
                      currentUser={profile}
                      courses={instructorCourses}
                      modules={modulesList}
                      contents={contentsList}
                      selectedCourseId={selectedCourseId}
                      selectedModuleId={selectedModuleId}
                      onSelectCourse={setSelectedCourseId}
                      onSelectModule={setSelectedModuleId}
                      onReloadAcademic={() => loadInstructorData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'evaluations' && (
                    <InstructorEvaluationsModule
                      courses={instructorCourses}
                      modules={modulesList}
                      assignments={assignmentsList}
                      exams={examsList}
                      assignmentSubmissions={assignmentSubmissions}
                      examSubmissions={examSubmissions}
                      studentsMap={studentsMap}
                      focusedAssignmentId={focusedAssignmentId}
                      onReloadAcademic={() => loadInstructorData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}

              {profile.rol === 'student' && (
                <>
                  {resolvedActiveTab === 'my-courses' && (
                    <StudentCoursesModule
                      currentUser={profile}
                      enrollments={studentEnrollments}
                      modules={modulesList}
                      contents={contentsList}
                      selectedCourseId={selectedCourseId}
                      selectedModuleId={selectedModuleId}
                      onSelectCourse={setSelectedCourseId}
                      onSelectModule={setSelectedModuleId}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'tasks-exams' && (
                    <StudentTasksExamsModule
                      currentUser={profile}
                      modules={modulesList}
                      assignments={assignmentsList}
                      exams={examsList}
                      assignmentSubmissions={assignmentSubmissions}
                      examSubmissions={examSubmissions}
                      coursesMap={studentCoursesMap}
                      focusedAssignmentId={focusedAssignmentId}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'reviews' && (
                    <StudentReviewsModule
                      currentUser={profile}
                      enrollments={studentEnrollments}
                      reviews={studentReviews}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
