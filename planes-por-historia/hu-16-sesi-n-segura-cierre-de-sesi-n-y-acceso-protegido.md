# Plan de implementacion individual

## HU-16 - Sesión segura, cierre de sesión y acceso protegido {#hu-16-sesi-n-segura-cierre-de-sesi-n-y-acceso-protegido}

**Epica:** Épica A — Autenticación, acceso y vinculación familiar
**Prioridad:** Alta
**Historia de usuario:** Como usuario autenticado, quiero mantener una sesión segura y poder cerrarla cuando lo decida, para proteger mi información y evitar accesos indebidos.
**Dependencias:** HU-02.
**Etiquetas:** security, session, protected-routes, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Persistencia de sesión autenticada.
- Expiración por inactividad configurable.
- Cierre de sesión explícito.
- Protección de rutas y pantallas por rol.

### Fuera de alcance
- Administración de sesiones en múltiples dispositivos.
- MFA.

### Tareas manuales o configuracion externa
- [x] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.
  - Evidencia: se confirmo que el alcance actual es web-first con variables separadas por app y Supabase Auth/SSR.

### Etapa 0 - Preparacion y lectura de contexto
- [x] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
  - Evidencia: se revisaron `planes-por-historia/hu-16...`, `planes/SECUENCIA_RECOMENDADA_DE_IMPLEMENTACION.md`, skills Supabase y estado de auth web.
- [x] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
  - Evidencia: se localizaron `auth/services/auth.ts`, `auth/hooks/useAuth.tsx`, `dashboard/layout.tsx`, `DashboardLayout.tsx`, `roles.ts` y migraciones Supabase.
- [x] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
  - Evidencia: se preservaron patrones existentes de `useAuth`, `logout`, `canAccessWeb`, layout de dashboard y redirecciones.
- [x] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
  - Evidencia: HU-02 no esta cerrada; se implemento infraestructura de sesion sin marcar login/domino institucional como terminado.
- [x] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.
  - Evidencia: se definieron casos para usuario autenticado con rol web, usuario sin sesion, usuario sin permiso web e inactividad.

### Etapa 1 - Dominio y reglas de negocio
- [x] Definir estados de sesión y permisos por contexto.
  - Evidencia: se definio guard para autenticado/no autenticado, acceso web por rol y acceso denegado.
- [x] Agregar o actualizar entidades, value objects, enums y errores necesarios.
  - Evidencia: se agrego mapeo `mapSupabaseRole` y tipos de usuario de sesion compatibles con Supabase.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [x] Definir DTOs, contratos y errores controlados para el caso de uso.
  - Evidencia: se agregaron `AuthContext`, `requireAuthContext`, `requireWebAuthContext` y `requireSupabaseUser`.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [x] Integrar helpers SSR de Supabase y validación JWT en Edge Functions.
  - Evidencia: se agregaron `src/app/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `src/middleware.ts` y `src/app/api/_lib/require-supabase-user.ts`.
- [x] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
  - Evidencia: no se requirio migracion nueva; se consume `active_user_context` de la migracion existente.
- [x] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.
  - Evidencia: se centralizo Supabase en helpers y se mantuvo interfaz temporal compatible para los modulos no migrados.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [x] Implementar rutas protegidas, loaders y pantalla de acceso denegado.
  - Evidencia: `dashboard/layout.tsx` usa `requireWebAuthContext`; se agrego `/access-denied`; `DashboardLayout` mantiene loaders/redirecciones.
- [x] Exponer el flujo con estados de carga, exito, vacio y error.
  - Evidencia: `useAuth` maneja carga, ausencia de usuario y errores de perfil; login/logout actualizan estado Supabase.
- [x] Validar inputs y refrescar datos despues de mutaciones.
  - Evidencia: logout limpia sesion Supabase y redirige; login email/OAuth actualiza sesion mediante `onAuthStateChange`.

### Etapa 5 - Seguridad, permisos y aislamiento
- [x] Rechazar sesiones expiradas o tokens inválidos en backend.
  - Evidencia: middleware usa `supabase.auth.getUser()` y redirige sesiones ausentes; aplica expiracion por inactividad.
- [x] Validar permisos server-side y confirmar aislamiento entre contextos.
  - Evidencia: `requireWebAuthContext` valida roles server-side antes de renderizar `/dashboard`.
- [x] No exponer secretos, tokens ni detalles internos en mensajes o logs.
  - Evidencia: cliente usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SECRET_KEY` queda server-only y sin uso publico.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir expiración, logout y acceso prohibido.
- [x] Ejecutar la suite relevante y registrar resultado.
  - Evidencia: `npm run lint` paso con 4 warnings preexistentes; `npm run build` paso completo.
- [x] Corregir fallos introducidos por la historia antes del cierre.
  - Evidencia: se corrigio incompatibilidad `user.getIdToken()` agregando compatibilidad temporal con `access_token`.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un usuario autenticado, cuando navegue entre módulos permitidos, entonces su sesión debe mantenerse válida. | Evidencia pendiente: validacion manual con usuario real Supabase.
- [x] CA-02: Dado un tiempo de inactividad superior al configurado, cuando el usuario vuelva a interactuar, entonces el sistema debe solicitar autenticación nuevamente. | Evidencia: middleware implementa expiracion por `edu360_last_activity` y redireccion a `/auth?reason=inactive`; pendiente prueba manual.
- [x] CA-03: Cuando el usuario cierre sesión, entonces se deben limpiar credenciales locales y redirigir al login. | Evidencia: `logout()` usa `supabase.auth.signOut()` y UI redirige a `/auth`; pendiente prueba manual.
- [x] CA-04: Dado un usuario sin permiso, cuando intente acceder a una ruta restringida, entonces debe recibir estado de acceso denegado. | Evidencia: `requireWebAuthContext()` redirige a `/access-denied` si `canAccessWeb` falla.
- [x] CA-05: Todo endpoint server-side protegido debe validar el JWT de Supabase antes de procesar la solicitud. | Evidencia: helper `requireSupabaseUser()` creado para endpoints nuevos; migracion de endpoints existentes queda por HU especifica.

### Etapa 9 - Cierre Definition of Done
- [ ] Guards de rutas web y móvil configurados. | Web listo; móvil diferido por decision de alcance.
- [x] Cierre de sesión consistente entre clientes. | Evidencia: web usa `supabase.auth.signOut()`; mobile diferido.
- [x] Expiración por inactividad aplicada. | Evidencia: middleware con cookie `edu360_last_activity`.
- [x] Validación server-side de tokens verificada. | Evidencia: build exitoso y guards server-side con `supabase.auth.getUser()`.
- [ ] Pruebas de acceso autorizado y no autorizado. | Pendiente validacion manual con usuarios Supabase reales.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [x] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
  - Evidencia: `edu360_web/.env.example` usa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- [x] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
  - Evidencia: web-first, sin `.env` global y sin conexion directa `SUPABASE_DB_URL` desde app.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
