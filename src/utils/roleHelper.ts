// src/utils/roleHelper.ts

export const ROLE_MAPPING: Record<string, string> = {
  system: 'Sistemas',
  administration: 'Administración',
  instructor: 'Docente',
  student: 'Estudiante',
  admin: 'Sistemas',
  secretary: 'Administración',
};

export const VALID_ROLES = ['student', 'instructor', 'administration', 'system'] as const;
export type ValidUserRole = (typeof VALID_ROLES)[number];

/**
 * Normaliza y limpia cualquier entrada de rol a su clave técnica reconocida por el ENUM `user_role` de PostgreSQL.
 * Soporta mayúsculas, tildes, espacios y etiquetas en español (Docente, Administración, Sistemas, etc.).
 * Retorna 'student' como valor seguro por defecto si no es válido.
 */
export function normalizeUserRole(roleInput?: unknown): ValidUserRole {
  if (!roleInput || typeof roleInput !== 'string') {
    return 'student';
  }

  // Limpiar espacios, minúsculas y remover acentos/tildes
  const clean = roleInput
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  switch (clean) {
    case 'system':
    case 'sistemas':
    case 'admin':
    case 'administrador':
      return 'system';
    case 'administration':
    case 'administracion':
    case 'secretary':
    case 'secretaria':
      return 'administration';
    case 'instructor':
    case 'docente':
    case 'catedratico':
    case 'profesor':
      return 'instructor';
    case 'student':
    case 'estudiante':
    case 'alumno':
      return 'student';
    default:
      return 'student';
  }
}

/**
 * Traduce el identificador técnico de la base de datos a su etiqueta oficial en español,
 * omitiendo por completo cualquier prefijo como "Rol" o "rol:".
 */
export function getRoleDisplayName(roleKey?: string | null): string {
  if (!roleKey) return '';
  const cleanKey = roleKey.toLowerCase().trim();
  return ROLE_MAPPING[cleanKey] || roleKey;
}
