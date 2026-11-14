import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CourseCard from '@/components/CourseCard';
import { decodeId } from '@/utils/routeHasher';
import { fetchPublicCourseById } from '@/utils/publicCourses';
import CourseDetailClassroom from './CourseDetailClassroom';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: maskedId } = await params;

  // Solo se aceptan IDs enmascarados válidos; un ID plano o manipulado devuelve 404.
  const courseId = maskedId.startsWith('m_') ? decodeId(maskedId) : null;
  if (!courseId || !UUID_REGEX.test(courseId)) {
    notFound();
  }

  let course = null;
  try {
    course = await fetchPublicCourseById(courseId);
  } catch {
    notFound();
  }
  if (!course) notFound();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar currentPath="/courses" />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <CourseCard course={course} actionText="Ver curso" isEnrolled={false} />
        </div>
        <CourseDetailClassroom courseId={courseId} courseTitle={course.title} />
      </main>
    </div>
  );
}
