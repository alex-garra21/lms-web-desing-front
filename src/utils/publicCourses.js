/**
 * publicCourses.js
 *
 * Cliente de solo lectura hacia las vistas públicas de Supabase (PostgREST).
 * Consume `vw_public_courses` (definida en Schema.sql) usando únicamente la
 * clave anónima, nunca las tablas maestras (protegidas por RLS).
 *
 * Variables de entorno requeridas (ver .env.example):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function queryView(view, query = '', signal) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${view}${query}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
  }

  if (!response.ok) {
    throw new Error(`Error al consultar los cursos (HTTP ${response.status}).`);
  }

  return response.json();
}

/**
 * Transforma una fila de `vw_public_courses` al modelo que consumen
 * `CourseCard` y la página de catálogo. Los campos que la vista aún no
 * expone (nivel, duración, lecciones, modalidad) quedan sin definir para que
 * CourseCard aplique sus valores por defecto.
 */
export function mapCourseRow(row) {
  const categories = row.categorias
    ? String(row.categorias).split(',').map((name) => name.trim()).filter(Boolean)
    : [];

  return {
    id: row.course_id,
    title: row.titulo,
    description: row.descripcion,
    thumbnail: row.thumbnail || null,
    category: categories[0] || undefined,
    categories,
    rating: Number(row.promedio_estrellas) || 0,
    reviewsCount: Number(row['total_reseñas']) || 0,
    instructor: {
      name: row.instructor_nombre || 'Docente UMG',
      avatar: row.instructor_avatar || null,
      title: 'Docente UMG',
    },
  };
}

/** Lista todos los cursos públicos activos. */
export async function fetchPublicCourses(signal) {
  const rows = await queryView('vw_public_courses', '?select=*', signal);
  return rows.map(mapCourseRow);
}

/** Obtiene un curso público por su UUID real (ya desenmascarado). */
export async function fetchPublicCourseById(courseId, signal) {
  const rows = await queryView(
    'vw_public_courses',
    `?select=*&course_id=eq.${encodeURIComponent(courseId)}&limit=1`,
    signal
  );
  return rows.length ? mapCourseRow(rows[0]) : null;
}
