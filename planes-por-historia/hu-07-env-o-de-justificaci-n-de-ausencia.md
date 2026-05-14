# Plan de implementacion individual

## HU-07 - Envío de justificación de ausencia {#hu-07-env-o-de-justificaci-n-de-ausencia}

**Epica:** Épica D — Solicitudes de ausencia y justificaciones
**Prioridad:** Alta
**Historia de usuario:** Como encargado legal, quiero justificar una ausencia ya registrada y adjuntar respaldo, para cumplir el reglamento institucional dentro del plazo permitido.
**Dependencias:** HU-03.; HU-06.; HU-25.
**Etiquetas:** absences, guardian-app, storage, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe en mobile un flujo de justificaciones para encargados, con captura de datos, seleccion de clases y subida de adjuntos a Firebase Storage.
- HU-07 debe planificarse como migracion funcional a Supabase Storage/PostgreSQL, aprovechando el flujo ya construido y ajustando reglas de vigencia, vinculo autorizado y politicas de archivo.
- La UI nueva solo se justifica si el formulario actual no puede expresar los criterios de aceptacion refinados.

### Alcance funcional
- Selección del estudiante vinculado y ausencia elegible.
- Captura de motivo y adjunto PDF o imagen.
- Validación de máximo 3 días hábiles.
- Envío al profesor correspondiente.

### Fuera de alcance
- Solicitudes de ausencia futura.
- Resolución de la solicitud por el profesor.

### Tareas manuales o configuracion externa
- [ ] Crear o validar manualmente buckets, permisos y limites de archivos cuando no esten cubiertos por migracion: Guardar adjuntos en Supabase Storage y metadata en PostgreSQL.
- [ ] Crear o validar manualmente buckets, permisos y limites de archivos cuando no esten cubiertos por migracion: Validar vínculo encargado-estudiante y Storage policies.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir reglas de elegibilidad y ventana hábil.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Guardar adjuntos en Supabase Storage y metadata en PostgreSQL.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar el formulario existente de justificaciones para cubrir HU-07 sobre Supabase.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Validar vínculo encargado-estudiante y Storage policies.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir fecha válida, fecha expirada, feriado y archivo inválido.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dada una ausencia reciente dentro de 3 días hábiles, cuando el encargado complete el formulario, entonces debe poder enviarla. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: El cálculo de plazo debe excluir feriados configurados en el calendario escolar. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Si el plazo expiró, el sistema debe impedir el envío y explicar el motivo. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: El sistema debe aceptar únicamente formatos de archivo permitidos para respaldo. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Tras enviar, la solicitud debe quedar con estado pendiente y notificarse al profesor correspondiente. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo móvil de justificación disponible. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validación de plazo hábil y feriados integrada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Storage configurado para adjuntos protegidos. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Estado inicial y notificación creados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de plazo, formatos y vínculo familiar ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
