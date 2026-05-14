# Plan de implementacion individual

## HU-23 - Centro de notificaciones en app {#hu-23-centro-de-notificaciones-en-app}

**Epica:** Épica G — Notificaciones, alertas, reportes y analítica
**Prioridad:** Alta
**Historia de usuario:** Como usuario de Edu360, quiero consultar mis notificaciones dentro de la aplicación, para revisar eventos importantes aunque no haya visto el push o correo original.
**Dependencias:** HU-16.
**Etiquetas:** notifications, realtime, inbox, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Alcance funcional
- Listado de notificaciones relevantes para el usuario.
- Estado leído/no leído.
- Apertura del detalle o destino funcional.
- Soporte para eventos de asistencia, ausencias, tareas, evaluaciones y alertas.

### Fuera de alcance
- Preferencias avanzadas de suscripción por tipo.
- Mensajería bidireccional.

### Tareas manuales o configuracion externa
- [ ] Revisar manualmente que RLS y politicas queden activas y probadas con actores distintos: RLS por destinatario.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir tipos de notificación y estado de lectura.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir notificaciones y relacionarlas con eventos de negocio.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Crear bandeja compacta con badges y detalle.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] RLS por destinatario.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir recepción, lectura y acceso aislado.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El usuario debe ver únicamente notificaciones dirigidas a su perfil. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Las notificaciones deben mostrar tipo, mensaje y fecha. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: El usuario debe poder marcar una notificación como leída. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Cuando exista destino funcional, la notificación debe llevar al contexto relacionado. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Los eventos críticos deben quedar disponibles aunque el push externo falle. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Centro de notificaciones disponible en app y/o web según rol. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Persistencia de `notifications` operativa. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Marcar leído funcionando. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Navegación contextual contemplada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de visibilidad y fallback realizadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
