# Plan de implementacion individual

## HU-22 - Historial de solicitudes y consulta administrativa {#hu-22-historial-de-solicitudes-y-consulta-administrativa}

**Epica:** Épica D — Solicitudes de ausencia y justificaciones
**Prioridad:** Media
**Historia de usuario:** Como encargado legal o administrador autorizado, quiero consultar el estado e historial de solicitudes de ausencia, para dar seguimiento a los trámites sin modificar decisiones ya tomadas.
**Dependencias:** HU-07.; HU-08.; HU-21.
**Etiquetas:** absences, history, admin-readonly, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Historial por estudiante vinculado para encargados.
- Consulta global de centro en modo lectura para administrador.
- Estados pendiente, aprobada y rechazada.
- Filtros por fechas, estudiante y estado.

### Fuera de alcance
- Edición o cancelación de solicitudes.
- Reapertura del dictamen.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir proyección de historial de solicitudes.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Crear consultas optimizadas sobre `absence_requests`.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Construir listas con badges de estado y filtros.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Restringir por centro y vínculo familiar.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir historial de encargado, consulta admin y acceso bloqueado.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El encargado debe visualizar solo solicitudes de sus estudiantes vinculados. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: El administrador debe visualizar solicitudes de su centro en modo lectura. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: El historial debe mostrar estado, fechas, tipo de solicitud y resolución cuando exista. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Los filtros deben permitir localizar solicitudes por estudiante y estado. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Un usuario sin permisos no debe consultar solicitudes de otro centro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Vistas diferenciadas para encargado y administrador. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Consultas paginadas o eficientes para listados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Estados legibles y consistentes. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] RLS probada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de filtros y segmentación completadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
