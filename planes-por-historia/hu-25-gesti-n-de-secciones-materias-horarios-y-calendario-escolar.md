# Plan de implementacion individual

## HU-25 - Gestión de secciones, materias, horarios y calendario escolar {#hu-25-gesti-n-de-secciones-materias-horarios-y-calendario-escolar}

**Epica:** Épica F — Administración, importaciones y configuración académica
**Prioridad:** Alta
**Historia de usuario:** Como administrador, quiero configurar secciones, subgrupos, materias y calendario escolar, para sostener correctamente la operación académica del centro.
**Dependencias:** HU-16.
**Etiquetas:** admin, academic-setup, catalog, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- El repo ya posee superficies administrativas para grupos, horarios, estudiantes, profesores y centros, aunque el modelo actual siga acoplado a Firebase.
- HU-25 debe consolidar y migrar esas piezas al modelo maestro de Supabase/PostgreSQL, cerrando vacios de calendario escolar y consistencia entre entidades.
- Antes de crear nuevos modulos, validar que parte de las pantallas actuales se reutiliza, cual se refactoriza y cual realmente falta.

### Alcance funcional
- Gestión de secciones y subgrupos.
- Gestión de materias y asignaciones.
- Configuración de calendario, feriados y períodos.
- Relación básica con profesores y horarios.

### Fuera de alcance
- Planeamiento curricular completo.
- Cálculo automático de notas finales.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Modelar `sections`, `subgroups`, `subjects`, `academic_periods`.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Crear índices y constraints relacionales.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar las pantallas administrativas existentes y completar solo las superficies faltantes de HU-25.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Autorizar solo admin/super admin según scope.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir relaciones válidas, duplicidad y feriados.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: El administrador debe crear y editar secciones con formato válido. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Debe registrar subgrupos opcionales asociados a secciones. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Debe configurar materias y relacionarlas con secciones/subgrupos. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Debe administrar feriados y períodos usados por reglas de asistencia y justificaciones. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Los datos configurados deben quedar aislados por centro educativo. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] CRUD administrativo disponible para catálogos esenciales. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Reglas de formato y relaciones validadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Calendario consumible por otros casos de uso. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Aislamiento multi-tenant verificado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de estructura académica ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
