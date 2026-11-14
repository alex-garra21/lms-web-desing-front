export const initialCourses = [
  {
    id: 'course-web',
    title: 'Desarrollo Web y Arquitectura de Sistemas',
    description:
      'Diseño y desarrollo de aplicaciones web modernas, organizadas por capas y con controles de seguridad.',
    instructor: 'Ing. Carlos Mendoza',
    status: 'PUBLICADO',
    modules: [
      {
        id: 'module-web-1',
        title: 'Fundamentos de desarrollo web',
        order: 1,
        lessons: [
          { id: 'lesson-web-1', title: 'Estructura HTML semántica', content: 'Elementos semánticos y estructura base de una página.', order: 1, duration: 35 },
          { id: 'lesson-web-2', title: 'Estilos y diseño adaptable', content: 'Principios de CSS y adaptación a diferentes tamaños de pantalla.', order: 2, duration: 45 },
        ],
      },
      {
        id: 'module-web-2',
        title: 'Arquitectura de aplicaciones',
        order: 2,
        lessons: [
          { id: 'lesson-web-3', title: 'Diseño por capas', content: 'Separación de presentación, lógica de aplicación y persistencia.', order: 1, duration: 50 },
        ],
      },
    ],
    evaluations: [
      {
        id: 'exam-web-1',
        moduleId: 'module-web-2',
        title: 'Evaluación presencial: Arquitectura',
        description: 'Evaluación de conceptos de arquitectura de aplicaciones.',
        minimumScore: 70,
        timeLimit: 30,
        maxAttempts: 2,
        requiresPresenceIoT: true,
        questions: [
          {
            id: 'question-web-1',
            prompt: '¿Cuál es un propósito principal de separar una aplicación en capas?',
            type: 'OPCION_MULTIPLE',
            weight: 10,
            options: [
              { text: 'Separar responsabilidades', correct: true },
              { text: 'Eliminar todas las pruebas', correct: false },
              { text: 'Duplicar la interfaz', correct: false },
              { text: 'Evitar el uso de módulos', correct: false },
            ],
          },
        ],
      },
      {
        id: 'exam-web-2',
        moduleId: 'module-web-1',
        title: 'Repaso de fundamentos',
        description: 'Comprobación de conceptos básicos de HTML y diseño web.',
        minimumScore: 70,
        timeLimit: 20,
        maxAttempts: 3,
        requiresPresenceIoT: false,
        questions: [],
      },
    ],
  },
  {
    id: 'course-data',
    title: 'Bases de Datos y Modelado de Información',
    description:
      'Modelado relacional, consultas SQL y buenas prácticas para almacenar información de forma segura.',
    instructor: 'Ing. Carlos Mendoza',
    status: 'BORRADOR',
    modules: [
      {
        id: 'module-data-1',
        title: 'Introducción a bases de datos',
        order: 1,
        lessons: [
          { id: 'lesson-data-1', title: 'Entidades y relaciones', content: 'Identificación de entidades, atributos y relaciones.', order: 1, duration: 40 },
        ],
      },
    ],
    evaluations: [],
  },
];

export const enrollmentMetrics = [
  { courseId: 'course-web', progress: 88, completed: false },
  { courseId: 'course-web', progress: 72, completed: false },
  { courseId: 'course-web', progress: 62, completed: false },
  { courseId: 'course-web', progress: 100, completed: true },
  { courseId: 'course-data', progress: 42, completed: false },
  { courseId: 'course-data', progress: 15, completed: false },
];

export const resultMetrics = [
  { courseId: 'course-web', score: 86, passed: true },
  { courseId: 'course-web', score: 72, passed: true },
  { courseId: 'course-web', score: 65, passed: false },
  { courseId: 'course-web', score: 91, passed: true },
];

export const iotEvents = [
  { student: 'Andrea López', course: 'Desarrollo Web y Arquitectura de Sistemas', action: 'AUTORIZAR_EXAMEN', when: 'Hoy, 09:14', reader: 'Lector aula 204' },
  { student: 'Luis Ramírez', course: 'Desarrollo Web y Arquitectura de Sistemas', action: 'ACCESO_AULA', when: 'Hoy, 09:02', reader: 'Lector aula 204' },
  { student: 'María Pérez', course: 'Desarrollo Web y Arquitectura de Sistemas', action: 'AUTORIZAR_EXAMEN', when: 'Ayer, 14:36', reader: 'Lector aula 204' },
];

export const courseStatuses = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PUBLICADO', label: 'Publicado' },
  { value: 'ARCHIVADO', label: 'Archivado' },
];

export const createDemoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
