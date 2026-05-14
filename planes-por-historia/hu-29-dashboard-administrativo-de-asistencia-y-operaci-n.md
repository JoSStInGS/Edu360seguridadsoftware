# Plan de implementacion individual

## HU-29 - Dashboard administrativo de asistencia y operación {#hu-29-dashboard-administrativo-de-asistencia-y-operaci-n}

**Epica:** Épica G — Notificaciones, alertas, reportes y analítica
**Prioridad:** Media
**Historia de usuario:** Como administrador, quiero visualizar indicadores generales de asistencia y operación, para detectar rápidamente riesgos y pendientes del centro educativo.
**Dependencias:** HU-06.; HU-13.; HU-20.
**Etiquetas:** analytics, admin-dashboard, attendance, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Tasa global de asistencia.
- Clases sin registro.
- Estudiantes críticos por umbral.
- Indicadores básicos en tiempo razonable.

### Fuera de alcance
- BI avanzado.
- Predicciones o analítica estadística sofisticada.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir agregados de asistencia requeridos.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Crear vistas o queries agregadas en PostgreSQL.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Diseñar panel administrativo sobrio y escaneable.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Restringir a admin/super admin por centro.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir métricas correctas y ausencia de fugas entre centros.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El dashboard debe mostrar la tasa general de asistencia del centro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Debe listar clases sin registro cuando existan. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Debe resaltar estudiantes bajo umbral configurado. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Los datos deben corresponder solo al centro del administrador. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: La pantalla debe manejar estados de carga, error y ausencia de datos. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Dashboard administrativo implementado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Consultas optimizadas y paginadas cuando aplique. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Indicadores consistentes con reportes exportables. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Scope multi-tenant validado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de datos y performance base completadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
