// src/utils/roleHelper.ts

export const ROLE_MAPPING: Record<string, string> = {
  system: 'Sistemas',
  administration: 'Administración',
  instructor: 'Docente',
  student: 'Estudiante',
  admin: 'Sistemas',
  secretary: 'Administración',
};

/**
 * Traduce el identificador técnico de la base de datos a su etiqueta oficial en español,
 * omitiendo por completo cualquier prefijo como "Rol" o "rol:".
 */
export function getRoleDisplayName(roleKey?: string | null): string {
  if (!roleKey) return '';
  const cleanKey = roleKey.toLowerCase().trim();
  return ROLE_MAPPING[cleanKey] || roleKey;
}
