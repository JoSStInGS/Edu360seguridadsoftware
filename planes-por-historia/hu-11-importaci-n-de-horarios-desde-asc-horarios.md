# Plan de implementacion individual

## HU-11 - Importación de horarios desde aSc Horarios {#hu-11-importaci-n-de-horarios-desde-asc-horarios}

**Epica:** Épica F — Administración, importaciones y configuración académica
**Prioridad:** Alta
**Historia de usuario:** Como administrador, quiero importar horarios desde un archivo exportado por aSc Horarios, para configurar de forma eficiente materias, profesores, secciones y bloques lectivos.
**Dependencias:** HU-25.
**Etiquetas:** import, schedules, admin, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe una ruta de importacion de horarios y una pagina administrativa de schedules sobre Firebase.
- HU-11 debe comenzar auditando parser, validaciones y UX existentes para migrarlos a Supabase/PostgreSQL, no asumiendo que todo se implementa desde cero.
- El trabajo nuevo se concentra en normalizar el pipeline, documentar el formato aSc pendiente y asegurar persistencia transaccional compatible con el nuevo esquema.

### Alcance funcional
- Carga del archivo de aSc.
- Lectura y mapeo de campos relevantes.
- Detección de duplicidades y cruces.
- Previsualización previa a persistir.
- Reporte de éxitos, advertencias y errores.

### Fuera de alcance
- Edición manual exhaustiva del horario importado.
- Definición final del formato exacto de aSc sin anexo técnico.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir modelo de mapping entre aSc y entidades Edu360.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Revisar y adaptar el parser server-side existente o trasladarlo a Edge Function/RPC si eso simplifica la migracion.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Construir wizard de carga, revisión y confirmación.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Restringir importación a admin o super admin.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir cruces, duplicados, previsualización y persistencia.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El administrador debe poder cargar un archivo válido de exportación de aSc. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: El sistema debe mostrar una previsualización antes de confirmar la importación. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Debe detectar conflictos de profesor, horario o duplicidad. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Al confirmar, los datos válidos deben persistirse en PostgreSQL. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Al finalizar, se debe generar un reporte con resultados y errores identificados. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo de importación implementado hasta el punto permitido por la especificación disponible. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validador y previsualización construidos. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Persistencia transaccional lista. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Reporte descargable o visible generado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas con archivos válidos, inválidos y conflictivos ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
