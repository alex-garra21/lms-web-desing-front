'use server';

import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { UserRole } from '@/app/dashboard/types';
import { normalizeUserRole, VALID_ROLES } from '@/utils/roleHelper';

export interface UpdateAdminUserInput {
  userId: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: UserRole | string;
  fecha_nacimiento?: string;
  direccion?: string;
  telefono?: string | null;
  nfc_token?: string | null;
}

export interface UpdateAdminUserResult {
  success: boolean;
  message: string;
  updatedData?: Record<string, unknown>;
}

/**
 * Server Action para actualizar colaboradores o estudiantes con privilegios elevados (service_role).
 * Normaliza estrictamente el rol para asegurar compatibilidad con el ENUM user_role de PostgreSQL,
 * actualiza Auth metadata y la tabla public.users.
 */
export async function updateAdminUserAction(
  input: UpdateAdminUserInput
): Promise<UpdateAdminUserResult> {
  try {
    const userId = input.userId?.trim();
    const nombres = input.nombres?.trim();
    const apellidos = input.apellidos?.trim();
    const correo = input.correo?.trim().toLowerCase();
    const rawRole = (typeof input?.rol === 'string' ? input.rol : '')?.trim();
    const candidateRole = normalizeUserRole(rawRole);
    const safeRole: UserRole =
      Boolean(candidateRole) && (VALID_ROLES as readonly string[]).includes(candidateRole)
        ? candidateRole
        : 'student';
    const fecha_nacimiento = input.fecha_nacimiento?.trim() || '2000-01-01';
    const direccion = input.direccion?.trim() || 'Campus Cobán, Alta Verapaz';
    const telefono = input.telefono?.trim() || null;
    const nfc_token_hash = input.nfc_token?.trim() || null;

    if (!userId) {
      return {
        success: false,
        message: 'El ID del usuario es requerido para actualizar.',
      };
    }

    if (!nombres || !apellidos || !correo) {
      return {
        success: false,
        message: 'Nombres, apellidos y correo institucional son obligatorios.',
      };
    }

    const payload = {
      nombres,
      apellidos,
      correo,
      fecha_nacimiento,
      direccion,
      telefono,
      rol: safeRole,
      nfc_token_hash,
      updated_at: new Date().toISOString(),
    };

    // 1. Actualizar en public.users mediante supabaseAdmin
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', userId);

    if (dbError) {
      console.error('[updateAdminUserAction] Error en public.users update:', dbError);
      return {
        success: false,
        message: `Error al actualizar en base de datos: ${dbError.message}`,
      };
    }

    // 2. Sincronizar user_metadata en auth.users si es posible
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: correo,
        user_metadata: {
          nombres,
          apellidos,
          rol: safeRole,
          fecha_nacimiento,
          direccion,
          telefono,
          ...(nfc_token_hash ? { nfc_token: nfc_token_hash } : {}),
        },
      });
    } catch (authErr) {
      console.error('[updateAdminUserAction] Aviso al actualizar auth.users metadata:', authErr);
    }

    return {
      success: true,
      message: `Perfil de ${nombres} ${apellidos} actualizado correctamente.`,
      updatedData: payload,
    };
  } catch (error: unknown) {
    console.error('[updateAdminUserAction] Excepción inesperada:', error);
    const errorMsg =
      error instanceof Error ? error.message : 'Error inesperado al actualizar usuario.';
    return {
      success: false,
      message: errorMsg,
    };
  }
}
