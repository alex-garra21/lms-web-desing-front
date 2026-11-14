// src/app/dashboard/types.ts

// =====================================================================
// Tipos alineados estrictamente con Schema.sql
// =====================================================================

export type UserRole = 'system' | 'administration' | 'instructor' | 'student';
export type CodeType = 'account_creation' | 'course_enrollment';
export type ExamModality = 'virtual' | 'presencial';
export type ExamType = 'parcial' | 'final';

export interface UserProfile {
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

export interface CourseRecord {
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

export interface RegistrationCodeRecord {
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

export interface AuditLogRecord {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  operacion: string;
  usuario_id: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
}

export interface ModuleRecord {
  id: string;
  course_id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  is_deleted: boolean;
  created_at: string;
}

export interface ContentRecord {
  id: string;
  module_id: string;
  titulo: string;
  cuerpo: string | null;
  youtube_url: string | null;
  orden: number;
  is_deleted: boolean;
  created_at: string;
}

export interface AssignmentRecord {
  id: string;
  module_id: string;
  titulo: string;
  descripcion: string;
  fecha_limite: string;
  punteo_maximo: number;
  is_deleted: boolean;
  created_at: string;
}

export interface ExamRecord {
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

export interface EnrollmentRecord {
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

export interface AssignmentSubmissionRecord {
  id: string;
  assignment_id: string;
  student_id: string;
  archivo_url: string | null;
  comentario: string | null;
  calificacion: number | null;
  calificado_at: string | null;
  created_at: string;
}

export interface ExamSubmissionRecord {
  id: string;
  exam_id: string;
  student_id: string;
  calificacion_automatica: number;
  asistencia_verificada: boolean;
  created_at: string;
}

export interface CourseReviewRecord {
  id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comentario: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface SoftDeletedItem {
  table: string;
  id: string;
  label: string;
  detail: string;
  timestamp: string;
}

export interface StatusFeedback {
  type: 'success' | 'error';
  message: string;
}

export interface DashboardTab {
  id: string;
  label: string;
  description: string;
}

export interface DashboardMetricItem {
  label: string;
  value: string;
  detail: string;
}
