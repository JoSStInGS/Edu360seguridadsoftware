# Plan de implementacion individual

## HU-24 - Gestión de usuarios y generación de códigos {#hu-24-gesti-n-de-usuarios-y-generaci-n-de-c-digos}

**Epica:** Épica F — Administración, importaciones y configuración académica
**Prioridad:** Alta
**Historia de usuario:** Como administrador, quiero gestionar cuentas de profesores y encargados, y generar códigos de registro o vinculación, para controlar quién accede al sistema y cómo se conecta con el centro.
**Dependencias:** HU-16.
**Etiquetas:** admin, user-management, codes, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe una base administrativa de usuarios y codigos en `dashboard/users` y sus Route Handlers asociados.
- HU-24 debe migrar y endurecer esa base sobre Supabase, incorporando estados de codigo, auditoria y scope por centro, antes de pensar en recrear la pagina.
- La generacion reutilizada por HU-01 y HU-03 debe conservarse como flujo canonico, aunque cambie su backend y contrato.

### Alcance funcional
- Crear, editar y desactivar usuarios habilitados por centro.
- Generar códigos de activación.
- Generar códigos de vinculación de estudiantes.
- Consultar estado básico de cada código.

### Fuera de alcance
- Gestión global de centros por super admin.
- Soporte de tickets o incidencias.

### Tareas manuales o configuracion externa
- [ ] Revisar manualmente que RLS y politicas queden activas y probadas con actores distintos: RLS y controles server-side para admin del centro.
  - Evidencia parcial: MCP Supabase confirmo RLS activo en tablas de HU-24 y advisors disponibles; falta prueba manual con actores reales.

### Etapa 0 - Preparacion y lectura de contexto
- [x] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
  - Evidencia: se reviso HU-24, backlog refinado y secuencia recomendada; HU-16 queda como dependencia previa.
- [x] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
  - Evidencia: se localizaron `dashboard/users`, `api/users`, `api/users/generate-code`, `api/validate-code`, tablas Supabase y policies RLS.
- [x] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
  - Evidencia: se preservaron componentes `UsersTable`, `GenerateCodeModal`, `EditUserModal` y contrato de respuestas existente.
- [x] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
  - Evidencia: MCP Supabase funciona; migraciones remotas `initial_schema`, `init-migration` y `operational_complements` estan aplicadas.
- [x] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.
  - Evidencia: MCP reporta 2 perfiles y cero `user_roles`, `teachers`, `students` y codigos; falta seed/usuario admin real para validacion manual.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir entidades administrativas y ciclo de vida de códigos.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [x] Persistir usuarios, roles, códigos y auditoría.
  - Evidencia: `/api/users` usa `profiles`, `user_roles` y `audit_logs`; `/api/users/generate-code` usa `activation_codes` y `activation_code_students`.
- [x] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
  - Evidencia: no se requirio migracion nueva; se reutilizaron tablas existentes confirmadas por MCP.
- [x] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.
  - Evidencia: los endpoints mantienen contrato legacy `admin/professor/parent` y mapean internamente a `center_admin/professor/guardian`.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [x] Adaptar las tablas, modales y formularios administrativos ya existentes para el nuevo contrato de HU-24.
  - Evidencia: `dashboard/users/page.tsx` lee usuarios por API Supabase y obtiene profesores/estudiantes desde tablas Supabase.
- [x] Exponer el flujo con estados de carga, exito, vacio y error.
  - Evidencia: se conserva carga existente, filtros y modales; errores de API se mantienen en consola/estado actual.
- [x] Validar inputs y refrescar datos despues de mutaciones.
  - Evidencia: roles, periodo, profesor y estudiantes se validan server-side; la pantalla refresca usuarios tras editar/desactivar.

### Etapa 5 - Seguridad, permisos y aislamiento
- [x] RLS y controles server-side para admin del centro.
  - Evidencia: se agrego `requireCenterAdmin()` y rutas server-side validan Bearer Supabase antes de operar.
- [x] Validar permisos server-side y confirmar aislamiento entre contextos.
  - Evidencia: endpoints filtran por `centerId` del administrador autenticado; falta validacion manual con segundo centro.
- [x] No exponer secretos, tokens ni detalles internos en mensajes o logs.
  - Evidencia: `SUPABASE_SECRET_KEY` solo se usa en helper server-only `createAdminClient()`.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir alta, edición, desactivación y generación de códigos.
- [x] Ejecutar la suite relevante y registrar resultado.
  - Evidencia: `npm run lint` paso con 2 warnings preexistentes; `npm run build` paso completo.
- [x] Corregir fallos introducidos por la historia antes del cierre.
  - Evidencia: lint/build no reportan errores introducidos por HU-24.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El administrador debe crear, editar y desactivar profesores o encargados de su centro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Debe poder generar códigos de registro ligados a rol y centro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Debe poder generar códigos de vinculación para estudiantes autorizados. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Los códigos deben mostrar estado vigente, usado o expirado. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: El administrador no debe administrar usuarios de otro centro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Pantallas administrativas operativas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Generación de códigos reutilizada por HU-01 y HU-03. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Desactivación de usuario disponible. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Auditoría de acciones críticas guardada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de scope por centro ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
