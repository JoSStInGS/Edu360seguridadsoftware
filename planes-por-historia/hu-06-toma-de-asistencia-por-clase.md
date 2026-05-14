# Plan de implementacion individual

## HU-06 - Toma de asistencia por clase {#hu-06-toma-de-asistencia-por-clase}

**Epica:** Épica C — Asistencia por clase
**Prioridad:** Alta
**Historia de usuario:** Como profesor asignado, quiero registrar el estado de asistencia de mis estudiantes por clase, para documentar presencia, puntualidad y novedades de cada lección.
**Dependencias:** HU-02.; HU-25.
**Etiquetas:** attendance, teacher, core-flow, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existen pantallas y servicios de asistencia en mobile y web, junto con endpoints de consulta/guardado basados en Firestore.
- HU-06 debe partir de esa base y migrarla al modelo `attendance_records`/PostgreSQL, revisando reglas de profesor asignado, feriados y scope por centro.
- Solo se deben crear componentes nuevos si el flujo actual no puede cubrir un CA del backlog refinado.

### Alcance funcional
- Selección de clase y grupo según horario.
- Carga de estudiantes de sección o subgrupo.
- Registro de estados: Presente, Ausente, Tardía, Salida Anticipada y Ausencia Justificada.
- Guardado del registro con timestamp y autor.

### Fuera de alcance
- Modificación posterior del registro.
- Alertas de atraso en toma de asistencia.

### Tareas manuales o configuracion externa
- [ ] Revisar manualmente que RLS y politicas queden activas y probadas con actores distintos: RLS por profesor, centro y asignación de materia.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Modelar `attendance_records` y reglas de estados permitidos.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Consultar horarios, estudiantes y persistir registros en PostgreSQL.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar la experiencia de marcado masivo y edicion rapida ya existente para alinearla con HU-06.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] RLS por profesor, centro y asignación de materia.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir grupo válido, grupo ajeno, feriado y persistencia.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un profesor asignado a una materia, cuando abra una clase vigente, entonces debe ver la lista correcta de estudiantes. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: El profesor debe poder asignar uno de los estados permitidos a cada estudiante. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Al guardar, el sistema debe persistir el registro con usuario responsable y marca de tiempo. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Un profesor no asignado a la materia no debe registrar asistencia. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: En fechas definidas como feriado, el sistema no debe permitir crear registros de asistencia. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo disponible en web y móvil para profesor. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Estados completos del SRS implementados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Auditoría mínima de autor y fecha incluida. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validación de profesor/materia y calendario escolar aplicada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de asistencia por sección y subgrupo ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
