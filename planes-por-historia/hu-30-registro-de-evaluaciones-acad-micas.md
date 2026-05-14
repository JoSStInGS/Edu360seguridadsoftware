# Plan de implementacion individual

## HU-30 - Registro de evaluaciones académicas {#hu-30-registro-de-evaluaciones-acad-micas}

**Epica:** Épica H — Evaluaciones y resultados académicos
**Prioridad:** Media
**Historia de usuario:** Como profesor, quiero registrar evaluaciones asociadas a una materia, grupo y fecha, para documentar instrumentos académicos aplicados en Edu360.
**Dependencias:** HU-25.
**Etiquetas:** evaluations, teacher, academics, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Título y tipo de evaluación.
- Materia, grupo y fecha.
- Puntaje máximo.
- Estado de evaluación.

### Fuera de alcance
- Ingreso de puntuaciones individuales.
- Cálculo final de promedios.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir entidad evaluación y estados.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir evaluación en PostgreSQL con constraints.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Crear gestor de evaluaciones docente.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Limitar creación a profesor asignado.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir campos obligatorios, estados y permisos.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El profesor debe crear evaluaciones solo para materias que imparte. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: La evaluación debe guardar fecha, tipo y puntaje máximo. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: El sistema no debe permitir puntuaciones si falta la definición base de la evaluación. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: La evaluación debe quedar asociada a centro, materia y grupo correctos. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: La pantalla debe diferenciar visualmente evaluaciones pendientes, aplicadas, calificadas y vencidas. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Formulario de creación docente disponible. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validaciones de datos obligatorios aplicadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Tabla `evaluations` operativa. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Estados visuales contemplados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de creación válida e inválida completadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
