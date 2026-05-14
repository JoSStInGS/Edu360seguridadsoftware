# Plan de implementacion individual

## HU-03 - Vinculación de estudiantes a encargados legales {#hu-03-vinculaci-n-de-estudiantes-a-encargados-legales}

**Epica:** Épica A — Autenticación, acceso y vinculación familiar
**Prioridad:** Alta
**Historia de usuario:** Como encargado legal, quiero vincular uno o más estudiantes mediante códigos autorizados, para consultar únicamente la información académica y de asistencia de quienes tengo a cargo.
**Dependencias:** HU-01.; HU-24.
**Etiquetas:** guardians, privacy, linking, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe una implementacion funcional de vinculacion para `parent`: generacion de codigos en web, `create-parent-links`, `register.tsx`, `add-child.tsx`, `ParentContext` y vistas de encargados.
- Este plan debe convertir esa base al modelo objetivo de `guardian_students`, no reemplazarla sin necesidad.
- La diferencia critica frente al legado es de contrato y seguridad: consentimiento informado, RLS, uso transaccional de codigos y acceso exclusivo a estudiantes vinculados.

### Alcance funcional
- Ingreso de código de vinculación.
- Asociación encargado-estudiante.
- Confirmación del vínculo creado.
- Registro del consentimiento informado de acceso a datos.

### Fuera de alcance
- Generación administrativa del código.
- Revocación o suspensión del vínculo.
- Gestión legal fuera del alcance del producto.

### Tareas manuales o configuracion externa
- [ ] Revisar manualmente que RLS y politicas queden activas y probadas con actores distintos: Aplicar RLS por relación autorizada.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Modelar vínculo encargado-estudiante y estado activo.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Crear acceso transaccional a `guardian_students`.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar los flujos de registro/vinculacion y `add-child` ya existentes para cumplir HU-03 sobre Supabase.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Aplicar RLS por relación autorizada.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir éxito, duplicidad, código inválido y acceso restringido.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un código válido, cuando el encargado lo ingrese, entonces se debe crear el vínculo con el estudiante correspondiente. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Un encargado debe poder vincular múltiples estudiantes, y un estudiante puede tener múltiples encargados. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Si el código no existe, venció o ya no está activo, entonces el sistema debe impedir la vinculación. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Antes de finalizar, el sistema debe mostrar el consentimiento de tratamiento de datos y registrar su aceptación. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Después de vincular, el encargado solo debe visualizar datos de estudiantes asociados a su cuenta. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo móvil disponible para encargados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Tabla de relación `guardian_students` operativa. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Consentimiento almacenado y recuperable. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Reglas RLS verificadas para impedir accesos cruzados. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de múltiples vínculos y rechazo de acceso indebido. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
