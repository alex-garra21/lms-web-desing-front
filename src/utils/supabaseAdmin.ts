import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // En entornos de cliente o donde falte la clave, avisar
  if (typeof window === 'undefined') {
    console.warn(
      'supabaseAdmin: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}

/**
 * Cliente administrativo de Supabase con privilegios elevados (service_role).
 * SOLO debe ser utilizado en el entorno de servidor (Server Actions o API Routes).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
