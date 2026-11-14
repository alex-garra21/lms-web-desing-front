-- =====================================================================
-- Políticas RLS para la tabla users (complemento de Schema.sql)
-- Schema.sql habilita RLS en users pero no define ninguna política, por lo
-- que el cliente autenticado no puede leer su propio rol/nombre.
-- Ejecutar en el SQL Editor de Supabase.
-- =====================================================================

DROP POLICY IF EXISTS "Usuario lee su propio perfil" ON users;
CREATE POLICY "Usuario lee su propio perfil" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Sistema y administración gestionan usuarios" ON users;
CREATE POLICY "Sistema y administración gestionan usuarios" ON users
    FOR ALL USING (get_user_role() IN ('system', 'administration'))
    WITH CHECK (get_user_role() IN ('system', 'administration'));

DROP POLICY IF EXISTS "Instructor lee perfiles de estudiantes" ON users;
CREATE POLICY "Instructor lee perfiles de estudiantes" ON users
    FOR SELECT USING (get_user_role() = 'instructor' AND rol = 'student');

-- Nota: no se concede UPDATE al propio usuario para evitar que modifique su rol.
