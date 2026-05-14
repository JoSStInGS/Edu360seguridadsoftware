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

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir entidades administrativas y ciclo de vida de códigos.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir usuarios, roles, códigos y auditoría.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar las tablas, modales y formularios administrativos ya existentes para el nuevo contrato de HU-24.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] RLS y controles server-side para admin del centro.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir alta, edición, desactivación y generación de códigos.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

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
