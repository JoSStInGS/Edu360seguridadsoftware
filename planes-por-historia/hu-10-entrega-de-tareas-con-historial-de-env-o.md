# Plan de implementacion individual

## HU-10 - Entrega de tareas con historial de envío {#hu-10-entrega-de-tareas-con-historial-de-env-o}

**Epica:** Épica E — Recursos educativos y Classroom
**Prioridad:** Media
**Historia de usuario:** Como estudiante, quiero entregar una tarea mediante archivo, texto o ambos, para cumplir con mis obligaciones académicas y conservar evidencia de envío.
**Dependencias:** HU-26.; HU-16.
**Etiquetas:** classroom, submissions, student-app, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Visualización de tarea asignada.
- Envío de evidencia según configuración docente.
- Registro de fecha y hora de entrega.
- Marcado automático de entrega tardía.
- Conservación del historial de envíos.

### Fuera de alcance
- Creación de tareas.
- Revisión y calificación docente.

### Tareas manuales o configuracion externa
- [ ] Crear o validar manualmente buckets, permisos y limites de archivos cuando no esten cubiertos por migracion: Persistir `task_submissions` y adjuntos en Storage.
- [ ] Confirmar manualmente la configuracion externa requerida: Crear pantalla de detalle y envío de tarea en menos de tres pasos principales.
- [ ] Confirmar manualmente la configuracion externa requerida: Cubrir puntualidad, tardanza, reenvío y acceso indebido.
- [ ] Confirmar manualmente la configuracion externa requerida: Envío de evidencia según configuración docente.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Modelar estados de entrega y regla de tardanza.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir `task_submissions` y adjuntos en Storage.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Crear pantalla de detalle y envío de tarea en menos de tres pasos principales.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Validar que la tarea pertenece al estudiante por grupo/materia.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir puntualidad, tardanza, reenvío y acceso indebido.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dada una tarea asignada, cuando el estudiante la abra, entonces debe ver instrucciones y fecha límite. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: El estudiante debe poder adjuntar archivo, escribir texto o usar ambos si la tarea lo permite. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Si la entrega ocurre después del límite, debe quedar marcada automáticamente como tardía. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Cada envío debe conservarse sin eliminar evidencia previa. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Tras enviar, el estudiante debe recibir confirmación visible del estado de su entrega. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo móvil de entrega disponible. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Historial de submissions persistido. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Regla de tardanza implementada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Soporte de archivos y texto verificado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de envío puntual, tardío y reenvío completadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
