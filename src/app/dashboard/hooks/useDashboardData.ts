'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { decodeId, maskRoute } from '@/utils/routeHasher';
import { ToastMessage, ToastType } from '@/components/Toast';
import { isValidUserRole } from '../utils';
import { ROLE_META, TABS_BY_ROLE } from '../constants';
import type {
  UserProfile,
  UserRole,
  CourseRecord,
  RegistrationCodeRecord,
  AuditLogRecord,
  ModuleRecord,
  ContentRecord,
  AssignmentRecord,
  ExamRecord,
  EnrollmentRecord,
  AssignmentSubmissionRecord,
  ExamSubmissionRecord,
  CourseReviewRecord,
  SoftDeletedItem,
  StatusFeedback,
} from '../types';

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [feedback, setFeedbackState] = useState<StatusFeedback | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sessionError, setSessionError] = useState<string>('');

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const setFeedback = useCallback(
    (fb: StatusFeedback | null) => {
      setFeedbackState(fb);
      if (fb && fb.message) {
        addToast(fb.message, fb.type);
      }
    },
    [addToast]
  );

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

    setActiveTab(tabParam || 'overview');
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

    // Consulta relacional extendida: módulos con contenidos, tareas (assignments) y exámenes (exams)
    const { data: modsRelData, error: modsRelError } = await supabase
      .from('modules')
      .select('*, contents(*), assignments(*), exams(*)')
      .in('course_id', courseIds)
      .eq('is_deleted', false)
      .order('orden', { ascending: true });

    let mods: ModuleRecord[] = [];
    if (!modsRelError && modsRelData) {
      mods = (modsRelData as ModuleRecord[]).map((mod) => ({
        ...mod,
        contents: (mod.contents || []).filter((c) => !c.is_deleted),
        assignments: (mod.assignments || []).filter((a) => !a.is_deleted),
        exams: (mod.exams || []).filter((ex) => !ex.is_deleted),
      }));
    } else {
      const { data: modsFallback } = await supabase
        .from('modules')
        .select('*')
        .in('course_id', courseIds)
        .eq('is_deleted', false)
        .order('orden', { ascending: true });
      mods = (modsFallback || []) as ModuleRecord[];
    }

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

    const nestedContents = mods.flatMap((m) => m.contents || []);
    const nestedAssignments = mods.flatMap((m) => m.assignments || []);
    const nestedExams = mods.flatMap((m) => m.exams || []);

    setContentsList(
      ((contentsRes.data && contentsRes.data.length > 0
        ? contentsRes.data
        : nestedContents) || []) as ContentRecord[]
    );
    setAssignmentsList(
      ((assignmentsRes.data && assignmentsRes.data.length > 0
        ? assignmentsRes.data
        : nestedAssignments) || []) as AssignmentRecord[]
    );
    setExamsList(
      ((examsRes.data && examsRes.data.length > 0
        ? examsRes.data
        : nestedExams) || []) as ExamRecord[]
    );
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
        const candidate = urlTab || (prev && prev !== '' ? prev : defaultTab);
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
    const onTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      } else {
        syncUrlParams();
      }
    };

    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('lms:urlchange', onUrlChange);
    window.addEventListener('lms:tabchange', onTabChange);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void initializeSession();
    });

    return () => {
      active = false;
      window.clearTimeout(timerId);
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('lms:urlchange', onUrlChange);
      window.removeEventListener('lms:tabchange', onTabChange);
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

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const targetUrl =
        newTab && newTab !== 'overview'
          ? maskRoute(`/dashboard?tab=${newTab}`)
          : maskRoute('/dashboard');
      window.history.pushState({}, '', targetUrl);
      window.dispatchEvent(
        new CustomEvent('lms:tabchange', { detail: { tab: newTab } })
      );
    }
  }, []);

  const roleMeta = profile ? ROLE_META[profile.rol] : null;
  const availableTabs = profile ? TABS_BY_ROLE[profile.rol] : [];
  const resolvedActiveTab =
    profile &&
    activeTab &&
    availableTabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : availableTabs[0]?.id || 'overview';

  return {
    // Estado de sesión y autenticación
    isLoading,
    isAuthenticated,
    profile,
    setProfile,
    sessionError,
    handleLogout,

    // Navegación
    activeTab,
    setActiveTab,
    handleTabChange,
    resolvedActiveTab,
    roleMeta,

    // Feedback y Toasts
    feedback,
    setFeedback,
    toasts,
    addToast,
    dismissToast,

    // Métricas
    roleMetrics,

    // Identificadores Anti-IDOR
    selectedCourseId,
    setSelectedCourseId,
    selectedModuleId,
    setSelectedModuleId,
    focusedUserId,
    focusedAssignmentId,

    // Datos administrativos
    usersList,
    codesList,
    allCourses,
    auditLogs,
    softDeletedItems,
    loadAdminModulesData,

    // Datos de instructor
    instructorCourses,
    loadInstructorData,
    studentsMap,

    // Datos de estudiante
    studentEnrollments,
    studentReviews,
    studentCoursesMap,
    loadStudentData,

    // Colecciones académicas compartidas
    modulesList,
    contentsList,
    assignmentsList,
    examsList,
    assignmentSubmissions,
    examSubmissions,
  };
}
