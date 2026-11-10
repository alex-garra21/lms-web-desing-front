# Directrices de Desarrollo - LMS UMG (Campus Cobán)

## 1. Stack Tecnológico & Entorno
- **Frontend:** React (Next.js App Router / Vite), Tailwind CSS v4 con `@theme inline`.
- **Backend / Base de Datos:** Supabase (PostgreSQL con Row Level Security - RLS).
- **Redirección y Seguridad:** Cloudflare (DNS / WAF).
- **Asistencia Local:** Ollama (Llama 3) / Aider para desarrollo offline sin límites de tokens.

## 2. Convenciones de Código y Estructura Modular
- **Escribir código limpio, modular y reutilizable.** Cada componente debe aceptar propiedades (`props`) flexibles y desacopladas.
- **Estructura de Directorios:**
  - `src/app/components/`: Componentes UI reutilizables (`Navbar`, `Button`, `Input`, `Select`, `CourseCard`, `VideoPlayer`).
  - `src/app/utils/`: Utilidades lógicas y de seguridad (`routeHasher.js`) y recursos gráficos modulares (`src/app/utils/icons/` para SVGs separados como `SunIcon.jsx`, `MoonIcon.jsx`, etc.).
  - `src/app/globals.css`: Fuente de verdad global para estilos y variables de diseño.
- **Manejo de Estados:** Manejar siempre estados de carga (`isLoading`) y control de errores robusto en llamadas asíncronas.

## 3. Estándares de Diseño y UI (Dark/Light Mode)
- **Modo Oscuro:** Soporte nativo mediante la clase `.dark` gestionada por el hook `useDarkMode.js`.
- **Paleta de Colores Semántica:** Utilizar exclusivamente las variables CSS globales definidas en `globals.css` y mapeadas en Tailwind (`--background`, `--foreground`, `--brand`, `--surface`, `--sidebar-bg`, etc.) para garantizar la consistencia visual automática entre temas claro y oscuro.

## 4. Seguridad Estricta y Enrutamiento (Anti-IDOR)
- **Rutas Hasheadas / Ofuscadas:** Queda estrictamente prohibido exponer IDs planos (`/courses/101`) en las URLs de navegación.
- **Uso Obligatorio de `routeHasher.js`:** Todas las rutas generadas en componentes de navegación (`Navbar`, tarjetas de cursos, botones de acción) deben pasar obligatoriamente por la función `maskRoute()` o `createMaskedUrl()` para enmascarar parámetros y prevenir ataques de Referencia Directa a Objetos Inseguros (IDOR).

## 5. Arquitectura de Roles y Vistas (Matriz de Accesos)
La plataforma gestiona 5 perfiles dinámicos desde el componente unificado `Navbar`:
1. **Público (Invitado):** Rutas de descubrimiento (`/`, `/courses`, `/instructors`, `/about`, `/faq`, `/login`, `/register`)[cite: 31].
2. **Estudiante:** Acceso a panel personal, catálogo, cursos inscritos, módulos de lecciones, reproductor de video (`VideoPlayer`), evaluaciones por módulo, calificaciones y certificados[cite: 32, 33].
3. **Instructor:** Permisos para visualizar contenido académico, gestionar módulos, lecciones, evaluaciones de los estudiantes asignados a sus cursos y control de progreso[cite: 32, 33].
4. **Secretaría:** Gestión administrativa, control de inscripciones, emisión de constancias, pagos y generación de códigos de asignación de cursos para estudiantes[cite: 33].
5. **Administrador:** Control total del sistema, gestión de usuarios, roles, asignaciones globales y bitácoras de auditoría de seguridad.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
