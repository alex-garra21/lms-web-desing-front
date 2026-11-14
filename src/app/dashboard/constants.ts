// src/app/dashboard/constants.ts
import { DashboardTab, UserRole } from './types';

export const ROLE_META: Record<
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

export const PROFILE_TAB: DashboardTab = {
  id: 'profile',
  label: 'Editar Datos',
  description: 'Actualiza tu información personal, contacto y foto de perfil',
};

export const SECURITY_TAB: DashboardTab = {
  id: 'security',
  label: 'Seguridad',
  description: 'Actualiza y protege tu contraseña institucional',
};

export const TABS_BY_ROLE: Record<UserRole, DashboardTab[]> = {
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

export const SAMPLE_QUESTIONS = [
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
