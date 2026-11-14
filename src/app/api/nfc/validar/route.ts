import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

interface UserNfcRow {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  codigo_empleado?: string | null;
  nfc_token_hash?: string | null;
  nfc_token_h?: string | null;
  is_deleted?: boolean;
}

/**
 * Normaliza un token NFC eliminando espacios extremos y convirtiendo a mayúsculas.
 */
function normalizeNfcToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Extrae una representación canónica sin separadores (espacios, ':', '-')
 * para tolerar variaciones de formato entre el lector ESP32 y la base de datos.
 */
function canonicalizeNfcToken(value: unknown): string {
  return normalizeNfcToken(value).replace(/[\s:-]+/g, '');
}

/**
 * Busca al estudiante en public.users por su token NFC soportando tanto
 * `nfc_token_hash` como `nfc_token_h`, siendo completamente tolerante a
 * mayúsculas/minúsculas, espacios adicionales y separadores.
 */
async function findStudentByNfcToken(rawToken: string): Promise<{
  student: UserNfcRow | null;
  errorMessage: string | null;
}> {
  const cleanToken = normalizeNfcToken(rawToken);
  const canonicalTarget = canonicalizeNfcToken(cleanToken);

  // 1. Consulta flexible case-insensitive sobre `nfc_token_hash` en public.users
  const { data: byHashCol, error: errHash } = await supabaseAdmin
    .from('users')
    .select('*')
    .ilike('nfc_token_hash', cleanToken)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!errHash && byHashCol) {
    return { student: byHashCol as UserNfcRow, errorMessage: null };
  }

  // 2. Consulta flexible case-insensitive con comodines por si el valor en BD tiene espacios al inicio/final
  const { data: byTrimmedHash, error: errTrimmed } = await supabaseAdmin
    .from('users')
    .select('*')
    .ilike('nfc_token_hash', `%${cleanToken}%`)
    .eq('is_deleted', false)
    .limit(10);

  if (!errTrimmed && Array.isArray(byTrimmedHash) && byTrimmedHash.length > 0) {
    const exactTrimMatch = (byTrimmedHash as UserNfcRow[]).find(
      (u) => normalizeNfcToken(u.nfc_token_hash) === cleanToken
    );
    if (exactTrimMatch) {
      return { student: exactTrimMatch, errorMessage: null };
    }
  }

  // 3. Intentar búsqueda por columna alternativa `nfc_token_h` si existe en el esquema
  const { data: byShortCol, error: errShort } = await supabaseAdmin
    .from('users')
    .select('*')
    .ilike('nfc_token_h', cleanToken)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!errShort && byShortCol) {
    return { student: byShortCol as UserNfcRow, errorMessage: null };
  }

  // 4. Respaldo tolerante a variaciones de formato (ej. "04:A3:2B:81" vs "04 A3 2B 81" vs "04A32B81")
  const { data: usersWithTokens, error: listErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .not('nfc_token_hash', 'is', null)
    .eq('is_deleted', false);

  if (!listErr && Array.isArray(usersWithTokens)) {
    const matchedUser = (usersWithTokens as UserNfcRow[]).find((u) => {
      const dbNorm = normalizeNfcToken(u.nfc_token_hash);
      const dbCanonical = canonicalizeNfcToken(u.nfc_token_hash);
      return (
        dbNorm === cleanToken ||
        (canonicalTarget.length > 0 && dbCanonical === canonicalTarget)
      );
    });

    if (matchedUser) {
      return { student: matchedUser, errorMessage: null };
    }
  }

  if (errHash && errShort && listErr) {
    return {
      student: null,
      errorMessage: errHash.message || listErr.message || errShort.message,
    };
  }

  return { student: null, errorMessage: null };
}

/**
 * POST /api/nfc/validar
 *
 * Modos soportados:
 * 1. Escaneo desde ESP32 o validación directa: recibe `{ nfc_token, exam_id? }`.
 *    Busca al estudiante en `public.users` con Service Role Key, registra la
 *    asistencia en `public.exam_attendances` y retorna un JSON de éxito con los datos del alumno.
 * 2. Inicio de espera desde la interfaz (`action: 'start_wait'`): recibe `{ action: 'start_wait', student_id, exam_id }`.
 *    Registra o reinicia el estado `'pending'` en `public.exam_attendances` para que el próximo
 *    escaneo físico del ESP32 quede asociado automáticamente a ese examen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : '';

    // Modo auxiliar: preparar registro en espera cuando el alumno pulsa "Validar Asistencia NFC"
    if (action === 'start_wait') {
      const studentId = String(body?.student_id || '').trim();
      const examId = String(body?.exam_id || '').trim();

      if (!studentId || !examId) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Se requieren student_id y exam_id para iniciar la espera NFC.',
          },
          { status: 400 }
        );
      }

      const { data: pendingRow, error: pendingErr } = await supabaseAdmin
        .from('exam_attendances')
        .upsert(
          [
            {
              exam_id: examId,
              student_id: studentId,
              nfc_verified: false,
              status: 'pending',
              verified_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'exam_id,student_id' }
        )
        .select('*')
        .maybeSingle();

      if (pendingErr) {
        return NextResponse.json(
          { ok: false, message: pendingErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: 'pending',
        message: 'Esperando aproximación de carné...',
        attendance: pendingRow,
      });
    }

    // Modo principal: validación de `nfc_token` (enviado por ESP32 o cliente)
    const rawToken = body?.nfc_token ?? body?.nfcToken ?? '';
    const cleanToken = String(rawToken).trim().toUpperCase();
    console.log('Token recibido:', cleanToken);

    const explicitExamId = body?.exam_id
      ? String(body.exam_id).trim()
      : '';

    if (!cleanToken) {
      return NextResponse.json(
        {
          ok: false,
          message: 'El parámetro nfc_token es obligatorio.',
        },
        { status: 400 }
      );
    }

    const { student, errorMessage } = await findStudentByNfcToken(cleanToken);

    if (errorMessage) {
      return NextResponse.json(
        {
          ok: false,
          message: `Error al consultar public.users: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'No se encontró ningún estudiante registrado con el token NFC proporcionado.',
        },
        { status: 404 }
      );
    }

    // Determinar a qué examen(es) registrar la asistencia en `exam_attendances`
    const targetExamIds = new Set<string>();
    if (explicitExamId) {
      targetExamIds.add(explicitExamId);
    }

    // Buscar si el alumno tiene una solicitud 'pending' activa en exam_attendances
    const { data: pendingAttendances } = await supabaseAdmin
      .from('exam_attendances')
      .select('exam_id')
      .eq('student_id', student.id)
      .eq('status', 'pending');

    (pendingAttendances || []).forEach((row: { exam_id?: string }) => {
      if (row.exam_id) targetExamIds.add(row.exam_id);
    });

    // Si el ESP32 envió solo `nfc_token` y no había fila 'pending' previa,
    // buscar exámenes presenciales activos para asociar la asistencia.
    if (targetExamIds.size === 0) {
      const { data: presencialExams } = await supabaseAdmin
        .from('exams')
        .select('id')
        .eq('modalidad', 'presencial')
        .eq('is_deleted', false)
        .order('fecha_apertura', { ascending: false })
        .limit(5);

      (presencialExams || []).forEach((ex: { id?: string }) => {
        if (ex.id) targetExamIds.add(ex.id);
      });
    }

    const nowIso = new Date().toISOString();
    const upsertRows = Array.from(targetExamIds).map((examId) => ({
      exam_id: examId,
      student_id: student.id,
      nfc_verified: true,
      status: 'verified',
      verified_at: nowIso,
    }));

    let registeredAttendances: unknown[] = [];
    if (upsertRows.length > 0) {
      const { data: attData, error: attError } = await supabaseAdmin
        .from('exam_attendances')
        .upsert(upsertRows, { onConflict: 'exam_id,student_id' })
        .select('*');

      if (attError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Error al registrar asistencia en exam_attendances: ${attError.message}`,
          },
          { status: 500 }
        );
      }
      registeredAttendances = attData || [];
    }

    const resolvedToken =
      student.nfc_token_h || student.nfc_token_hash || cleanToken;

    return NextResponse.json({
      ok: true,
      success: true,
      message: `Asistencia presencial NFC registrada para ${student.nombres} ${student.apellidos}.`,
      nfc_token: resolvedToken,
      student: {
        id: student.id,
        nombres: student.nombres,
        apellidos: student.apellidos,
        correo: student.correo,
        rol: student.rol,
        codigo_empleado: student.codigo_empleado || null,
        nfc_token: resolvedToken,
      },
      attendances: registeredAttendances,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Error interno al procesar la validación NFC.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nfc/validar?student_id=...&exam_id=...
 *
 * Permite al cliente consultar en tiempo real (sondeo corto complementario a Supabase Realtime)
 * si el ESP32 ya registró y verificó la tarjeta física del estudiante en `exam_attendances`.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = (searchParams.get('student_id') || '').trim();
    const examId = (searchParams.get('exam_id') || '').trim();
    const since = searchParams.get('since') || '';

    if (!studentId) {
      return NextResponse.json(
        { ok: false, message: 'El parámetro student_id es obligatorio.' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('exam_attendances')
      .select('*')
      .eq('student_id', studentId)
      .or('nfc_verified.eq.true,status.eq.verified')
      .order('verified_at', { ascending: false })
      .limit(1);

    if (examId) {
      query = query.eq('exam_id', examId);
    }
    if (since) {
      query = query.gte('verified_at', since);
    }

    const { data: attendance, error: attErr } = await query.maybeSingle();

    if (attErr) {
      return NextResponse.json(
        { ok: false, message: attErr.message },
        { status: 500 }
      );
    }

    if (!attendance) {
      return NextResponse.json({
        ok: true,
        verified: false,
        status: 'pending',
      });
    }

    const { data: student } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    const userRow = (student || null) as UserNfcRow | null;
    const detectedToken =
      userRow?.nfc_token_h || userRow?.nfc_token_hash || 'NFC-VERIFICADO';

    return NextResponse.json({
      ok: true,
      verified: true,
      status: attendance.status || 'verified',
      nfc_token: detectedToken,
      attendance,
      student: userRow
        ? {
            id: userRow.id,
            nombres: userRow.nombres,
            apellidos: userRow.apellidos,
            correo: userRow.correo,
            nfc_token: detectedToken,
          }
        : null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Error al consultar el estado de asistencia NFC.',
      },
      { status: 500 }
    );
  }
}
