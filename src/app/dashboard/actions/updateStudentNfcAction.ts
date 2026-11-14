'use server';

import { supabaseAdmin } from '@/utils/supabaseAdmin';

export interface UpdateStudentNfcInput {
  studentId: string;
  nfcTokenHash: string | null;
}

export interface UpdateStudentNfcResult {
  success: boolean;
  message: string;
  nfc_token_hash?: string | null;
  updatedStudent?: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    rol: string;
    nfc_token_hash: string | null;
    updated_at: string;
  };
}

/**
 * Server Action para vincular o actualizar de forma segura el campo `nfc_token_hash`
 * de un estudiante en la tabla `public.users`.
 */
export async function updateStudentNfcAction(
  input: UpdateStudentNfcInput
): Promise<UpdateStudentNfcResult> {
  try {
    const studentId = input.studentId?.trim();
    const rawToken =
      typeof input.nfcTokenHash === 'string' ? input.nfcTokenHash.trim() : '';
    const cleanToken = rawToken.length > 0 ? rawToken : null;

    if (!studentId) {
      return {
        success: false,
        message: 'El identificador del estudiante es obligatorio.',
      };
    }

    // 1. Verificar que el usuario exista y tenga el rol 'student'
    const { data: existingStudent, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, nombres, apellidos, correo, rol, is_deleted')
      .eq('id', studentId)
      .maybeSingle();

    if (fetchError) {
      return {
        success: false,
        message: `Error al verificar al estudiante: ${fetchError.message}`,
      };
    }

    if (!existingStudent || existingStudent.is_deleted) {
      return {
        success: false,
        message: 'No se encontró al estudiante activo en la base de datos.',
      };
    }

    if (existingStudent.rol !== 'student') {
      return {
        success: false,
        message:
          'La vinculación de carné estudiantil solo aplica a usuarios con el rol student.',
      };
    }

    // 2. Verificar que el UID/token no esté asignado a otro usuario distinto
    if (cleanToken) {
      const { data: duplicateUser } = await supabaseAdmin
        .from('users')
        .select('id, nombres, apellidos')
        .eq('nfc_token_hash', cleanToken)
        .neq('id', studentId)
        .maybeSingle();

      if (duplicateUser) {
        return {
          success: false,
          message: `El UID "${cleanToken}" ya está vinculado a otro usuario (${duplicateUser.nombres} ${duplicateUser.apellidos}).`,
        };
      }
    }

    const nowIso = new Date().toISOString();

    // 3. Actualizar `nfc_token_hash` en `public.users`
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        nfc_token_hash: cleanToken,
        updated_at: nowIso,
      })
      .eq('id', studentId)
      .select('id, nombres, apellidos, correo, rol, nfc_token_hash, updated_at')
      .single();

    if (updateError) {
      return {
        success: false,
        message: `Error al actualizar el token NFC en public.users: ${updateError.message}`,
      };
    }

    // 4. Sincronizar metadata en Supabase Auth de forma opcional
    try {
      await supabaseAdmin.auth.admin.updateUserById(studentId, {
        user_metadata: {
          nfc_token: cleanToken,
        },
      });
    } catch {
      // No bloquear si el usuario aún no existe en auth.users
    }

    return {
      success: true,
      message: cleanToken
        ? `Tarjeta NFC (${cleanToken}) vinculada exitosamente a ${existingStudent.nombres} ${existingStudent.apellidos}.`
        : `Credencial NFC desvinculada para ${existingStudent.nombres} ${existingStudent.apellidos}.`,
      nfc_token_hash: cleanToken,
      updatedStudent: updatedRow,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : 'Error inesperado al actualizar la credencial NFC.',
    };
  }
}
