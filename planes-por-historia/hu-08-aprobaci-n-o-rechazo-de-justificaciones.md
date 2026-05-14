# Plan de implementacion individual

## HU-08 - Aprobación o rechazo de justificaciones {#hu-08-aprobaci-n-o-rechazo-de-justificaciones}

**Epica:** Épica D — Solicitudes de ausencia y justificaciones
**Prioridad:** Alta
**Historia de usuario:** Como profesor responsable de la materia, quiero aprobar o rechazar justificaciones pendientes, para actualizar correctamente la asistencia y comunicar el resultado al encargado.
**Dependencias:** HU-07.; HU-06.; HU-23.
**Etiquetas:** approvals, attendance, notifications, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- El repositorio ya contiene rutas server-side de `justifications`, por lo que esta HU debe iniciar revisando cuanto del ciclo de decision ya existe y que parte solo esta bosquejada.
- La implementacion debe extender o reemplazar de forma controlada esa base hacia Supabase, manteniendo trazabilidad entre decision, cambio de asistencia y notificacion al encargado.
- Antes de crear nuevas rutas, validar si los endpoints actuales pueden evolucionar con contratos mas claros y seguridad basada en JWT/RLS.

### Alcance funcional
- Bandeja de solicitudes pendientes por materia.
- Dictamen aprobado o rechazado.
- Actualización automática del estado de asistencia cuando aplique.
- Notificación del resultado al encargado legal.

### Fuera de alcance
- Modificación directa de la solicitud enviada.
- Revisión por administrador con capacidad de decisión.

### Tareas manuales o configuracion externa
- [ ] Revisar manualmente que RLS y politicas queden activas y probadas con actores distintos: Aplicar RLS para profesor de la materia.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Modelar estados de solicitud y efectos en asistencia.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Ejecutar cambio de solicitud y asistencia de forma transaccional.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Crear interfaz de dictamen con detalle del adjunto.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Aplicar RLS para profesor de la materia.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Probar aprobación, rechazo y mutación automática de estado.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El profesor debe visualizar únicamente solicitudes asociadas a materias que imparte. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Al aprobar una justificación, la asistencia correspondiente debe pasar a `Ausencia Justificada`. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Al rechazarla, la solicitud debe quedar con estado rechazado sin cambiar la asistencia. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: El encargado legal debe recibir notificación del resultado. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: La decisión debe quedar trazada con profesor, fecha y estado final. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Bandeja de revisión disponible web/móvil. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Permisos por profesor/materia aplicados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Actualización automática de asistencia implementada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Notificaciones integradas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de aprobación, rechazo y acceso indebido completadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
