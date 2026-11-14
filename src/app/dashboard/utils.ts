// src/app/dashboard/utils.ts
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabaseClient';
import { UserRole } from './types';

export function isValidUserRole(value: unknown): value is UserRole {
  return (
    value === 'system' ||
    value === 'administration' ||
    value === 'instructor' ||
    value === 'student'
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin definir';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function buildSubmissionStoragePath(
  userId: string,
  assignmentId: string,
  fileName: string
): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${userId}/${assignmentId}/${timestamp}_${sanitizedName}`;
}

export function generateInstitutionalCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${random}`;
}

export function extractResourceLinks(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export function createEphemeralAuthClient() {
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

export async function recordAuditLog(params: {
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
