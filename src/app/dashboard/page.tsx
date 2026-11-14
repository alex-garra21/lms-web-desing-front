'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import { maskRoute } from '@/utils/routeHasher';
import { useDashboardData } from './hooks';
import {
  DashboardMetrics,
  FeedbackAlert,
  DashboardLoading,
  DashboardAuthRequired,
} from './components/shared';
import {
  AdminUsersModule,
  RegistrationCodesModule,
  SystemAuditModule,
} from './components/admin';
import {
  UserProfileEditModule,
  UserSecurityModule,
} from './components/tabs';
import {
  InstructorCoursesModule,
  InstructorEvaluationsModule,
} from './components/instructor';
import {
  StudentCoursesModule,
  StudentTasksExamsModule,
  StudentReviewsModule,
} from './components/student';

export default function DashboardPage() {
  const {
    isLoading,
    isAuthenticated,
    profile,
    setProfile,
    sessionError,
    handleLogout,
    resolvedActiveTab,
    roleMeta,
    feedback,
    setFeedback,
    roleMetrics,
    selectedCourseId,
    setSelectedCourseId,
    selectedModuleId,
    setSelectedModuleId,
    focusedUserId,
    focusedAssignmentId,
    usersList,
    codesList,
    allCourses,
    auditLogs,
    softDeletedItems,
    loadAdminModulesData,
    instructorCourses,
    loadInstructorData,
    studentsMap,
    studentEnrollments,
    studentReviews,
    studentCoursesMap,
    loadStudentData,
    modulesList,
    contentsList,
    assignmentsList,
    examsList,
    assignmentSubmissions,
    examSubmissions,
  } = useDashboardData();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar
        role={profile ? profile.rol : 'public'}
        user={
          profile
            ? {
                name: `${profile.nombres} ${profile.apellidos}`.trim(),
                role: profile.rol,
                avatar: profile.avatar,
              }
            : null
        }
        onLogout={handleLogout}
        currentPath={
          resolvedActiveTab
            ? maskRoute(`/dashboard?tab=${resolvedActiveTab}`)
            : maskRoute('/dashboard')
        }
      />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <DashboardLoading />
        ) : !isAuthenticated || !profile || !roleMeta ? (
          <DashboardAuthRequired sessionError={sessionError} />
        ) : (
          <>
            {/* Tarjetas KPI */}
            <DashboardMetrics metrics={roleMetrics} />

            {/* Alertas globales de retroalimentación */}
            <FeedbackAlert
              feedback={feedback}
              onClose={() => setFeedback(null)}
            />

            {/* Renderizado estricto por rol */}
            <div className="mt-8">
              {resolvedActiveTab === 'profile' && (
                <UserProfileEditModule
                  key={profile.updated_at || profile.id}
                  currentUser={profile}
                  onProfileUpdated={(updated) => {
                    setProfile(updated);
                    if (
                      updated.rol === 'system' ||
                      updated.rol === 'administration'
                    ) {
                      void loadAdminModulesData(updated.rol);
                    }
                  }}
                  onFeedback={setFeedback}
                />
              )}

              {resolvedActiveTab === 'security' && (
                <UserSecurityModule
                  key={`security-${profile.id}`}
                  currentUser={profile}
                  onFeedback={setFeedback}
                />
              )}

              {(profile.rol === 'system' || profile.rol === 'administration') && (
                <>
                  {resolvedActiveTab === 'users' && (
                    <AdminUsersModule
                      key={focusedUserId || 'users-module'}
                      currentUser={profile}
                      users={usersList}
                      focusedUserId={focusedUserId}
                      onReloadUsers={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'codes' && (
                    <RegistrationCodesModule
                      currentUser={profile}
                      codes={codesList}
                      courses={allCourses}
                      onReloadCodes={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {profile.rol === 'system' && resolvedActiveTab === 'audit' && (
                    <SystemAuditModule
                      currentUser={profile}
                      auditLogs={auditLogs}
                      softDeletedItems={softDeletedItems}
                      users={usersList}
                      onReloadAudit={() => loadAdminModulesData(profile.rol)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}

              {profile.rol === 'instructor' && (
                <>
                  {resolvedActiveTab === 'courses' && (
                    <InstructorCoursesModule
                      currentUser={profile}
                      courses={instructorCourses}
                      modules={modulesList}
                      contents={contentsList}
                      selectedCourseId={selectedCourseId}
                      selectedModuleId={selectedModuleId}
                      onSelectCourse={setSelectedCourseId}
                      onSelectModule={setSelectedModuleId}
                      onReloadAcademic={() => loadInstructorData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'evaluations' && (
                    <InstructorEvaluationsModule
                      courses={instructorCourses}
                      modules={modulesList}
                      assignments={assignmentsList}
                      exams={examsList}
                      assignmentSubmissions={assignmentSubmissions}
                      examSubmissions={examSubmissions}
                      studentsMap={studentsMap}
                      focusedAssignmentId={focusedAssignmentId}
                      onReloadAcademic={() => loadInstructorData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}

              {profile.rol === 'student' && (
                <>
                  {resolvedActiveTab === 'my-courses' && (
                    <StudentCoursesModule
                      currentUser={profile}
                      enrollments={studentEnrollments}
                      modules={modulesList}
                      contents={contentsList}
                      selectedCourseId={selectedCourseId}
                      selectedModuleId={selectedModuleId}
                      onSelectCourse={setSelectedCourseId}
                      onSelectModule={setSelectedModuleId}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'tasks-exams' && (
                    <StudentTasksExamsModule
                      currentUser={profile}
                      modules={modulesList}
                      assignments={assignmentsList}
                      exams={examsList}
                      assignmentSubmissions={assignmentSubmissions}
                      examSubmissions={examSubmissions}
                      coursesMap={studentCoursesMap}
                      focusedAssignmentId={focusedAssignmentId}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                  {resolvedActiveTab === 'reviews' && (
                    <StudentReviewsModule
                      currentUser={profile}
                      enrollments={studentEnrollments}
                      reviews={studentReviews}
                      onReloadStudentData={() => loadStudentData(profile.id)}
                      onFeedback={setFeedback}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
