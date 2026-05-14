# Plan de implementacion individual

## HU-05 - Registro de ingreso y estado "Activo en sede" {#hu-05-registro-de-ingreso-y-estado-activo-en-sede}

**Epica:** Épica B — Control de acceso institucional por QR
**Prioridad:** Alta
**Historia de usuario:** Como institución, quiero registrar el ingreso de un estudiante a partir del escaneo de su QR, para mantener actualizado su estado de presencia en sede y comunicarlo al encargado legal.
**Dependencias:** HU-04.; HU-23.
**Etiquetas:** qr, access-control, notifications, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Validación del QR presentado.
- Registro del evento de ingreso con timestamp.
- Cambio de estado a `Activo en sede`.
- Notificación inmediata al encargado legal.
- Confirmación antes de reingresar si ya estaba activo.

### Fuera de alcance
- Salida del estudiante.
- Tableros analíticos de asistencia.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir transición de estado `Fuera de sede` -> `Activo en sede`.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir evento y estado con transacción.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Crear feedback de escaneo aceptado, duplicado o rechazado.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Validar token del lector y no permitir altas manuales no autorizadas.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir ingreso válido, duplicado y QR inválido.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un QR válido de ingreso, cuando el lector lo escanee, entonces se debe crear un registro de acceso con timestamp. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Tras registrar el ingreso, el estudiante debe quedar con estado `Activo en sede`. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Cuando el ingreso se confirme, el encargado legal debe recibir una notificación push y/o correo según configuración. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Si el estudiante ya está `Activo en sede`, el sistema debe advertir y solicitar confirmación antes de registrar otro ingreso. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Si el QR es inválido o no autorizado, el sistema debe rechazar el evento sin modificar el estado del estudiante. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo de escaneo soportado en el dispositivo lector definido. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Tabla `access_logs` actualizada con trazabilidad. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Actualización de estado reflejada en backend. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Notificación integrada con cola o disparador server-side. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de reingreso, invalidez y éxito realizadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
