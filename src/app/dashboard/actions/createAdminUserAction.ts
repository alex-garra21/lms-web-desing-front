'use server';

import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { UserRole } from '@/app/dashboard/types';
import { normalizeUserRole, VALID_ROLES } from '@/utils/roleHelper';

export interface CreateAdminUserInput {
  nombres: string;
  apellidos: string;
  correo: string;
  password?: string;
  rol: UserRole | string;
  fecha_nacimiento: string;
  direccion: string;
  telefono?: string | null;
  nfc_token?: string | null;
}

export interface CreateAdminUserResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * Server Action para registrar colaboradores o estudiantes usando la Admin API de Supabase.
 * Normaliza y valida estrictamente el rol contra el ENUM user_role ('student', 'instructor', 'administration', 'system').
 * Si llega vacío (""), nulo o inválido, fuerza estrictamente 'student' tanto en user_metadata como en public.users.
 */
export async function createAdminUserAction(
  input: CreateAdminUserInput
): Promise<CreateAdminUserResult> {
  try {
    // 1. Normalización y validación estricta del Rol (ENUM user_role)
    const rawRole = (typeof input?.rol === 'string' ? input.rol : '')?.trim();
    const candidateRole = normalizeUserRole(rawRole);
    const safeRole: UserRole =
      Boolean(candidateRole) && (VALID_ROLES as readonly string[]).includes(candidateRole)
        ? candidateRole
        : 'student';

    const nombres = input?.nombres?.trim();
    const apellidos = input?.apellidos?.trim();
    const correo = input?.correo?.trim().toLowerCase();
    const password = input?.password?.trim();
    const fecha_nacimiento = input?.fecha_nacimiento?.trim() || '2000-01-01';
    const direccion = input?.direccion?.trim() || 'Campus Cobán, Alta Verapaz';
    const telefono = input?.telefono?.trim() || null;
    const nfc_token_hash = input?.nfc_token?.trim() || null;

    if (!nombres || !apellidos || !correo) {
      return {
        success: false,
        message: 'Nombres, apellidos y correo institucional son obligatorios.',
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        message: 'La contraseña inicial debe tener al menos 6 caracteres.',
      };
    }

    // 2. Metadatos de autenticación para Supabase Auth con rol sanitizado
    const userMetadata = {
      nombres,
      apellidos,
      rol: safeRole,
      fecha_nacimiento,
      direccion,
      telefono,
      ...(nfc_token_hash ? { nfc_token: nfc_token_hash } : {}),
    };

    // 3. Crear usuario en Supabase Auth mediante Admin API con service_role
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password: password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

    if (authError || !authData.user) {
      console.error('[createAdminUserAction] Error en supabaseAdmin.auth.admin.createUser:', authError);
      return {
        success: false,
        message: authError?.message || 'No se pudo registrar el usuario en Supabase Auth.',
      };
    }

    const newUserId = authData.user.id;

    // 4. Payload para inserción y sincronización en public.users garantizando rol válido
    // Dejamos codigo_empleado en NULL para que el trigger de BD (trg_generate_employee_code) lo genere automáticamente
    const userRowPayload = {
      id: newUserId,
      nombres,
      apellidos,
      correo,
      fecha_nacimiento,
      direccion,
      telefono,
      rol: safeRole,
      nfc_token_hash,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert([userRowPayload], { onConflict: 'id' });

    if (dbError) {
      console.error('[createAdminUserAction] Error en db upsert a public.users:', dbError);
      return {
        success: false,
        message: dbError.message || `Error al guardar en base de datos: ${dbError.message}`,
        userId: newUserId,
      };
    }

    return {
      success: true,
      message: `Usuario ${nombres} ${apellidos} registrado exitosamente.`,
      userId: newUserId,
    };
  } catch (error: unknown) {
    console.error('[createAdminUserAction] Excepción inesperada:', error);
    const errorMsg =
      error instanceof Error ? error.message : 'Error inesperado al crear usuario.';
    return {
      success: false,
      message: errorMsg,
    };
  }
}
