# Plan de implementacion individual

## HU-02 - Inicio de sesión con dominios institucionales {#hu-02-inicio-de-sesi-n-con-dominios-institucionales}

**Epica:** Épica A — Autenticación, acceso y vinculación familiar
**Prioridad:** Alta
**Historia de usuario:** Como profesor, administrador o estudiante, quiero iniciar sesión con credenciales válidas y un correo permitido para mi rol, para acceder de forma segura a Edu360.
**Dependencias:** HU-01.
**Etiquetas:** auth, login, role-validation, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existen flujos de login web y mobile, servicios de autenticacion y validaciones de dominio MEP sobre Firebase.
- HU-02 debe planificarse como migracion y endurecimiento: adaptar los flujos existentes a Supabase Auth, `profiles` y `user_roles`, conservando la navegacion por rol que ya funciona.
- Antes de crear nuevas pantallas, revisar los mensajes de error actuales, la carga de rol/centro y la separacion entre autenticacion y autorizacion.

### Alcance funcional
- Inicio de sesión con correo y contraseña.
- Validación de dominio institucional según rol.
- Mensajes diferenciados para credenciales inválidas o dominio no permitido.
- Redirección al espacio funcional correspondiente al rol.

### Fuera de alcance
- Google OAuth.
- Recuperación de contraseña.
- Persistencia de sesión y expiración configurable.

### Tareas manuales o configuracion externa
- [ ] Confirmar manualmente la configuracion externa requerida: No confiar en el dominio enviado por cliente; verificar en backend.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir reglas de compatibilidad entre rol y dominio.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Integrar Supabase Auth y carga de `profiles` / `user_roles`.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar las pantallas de login web y mobile ya existentes para las reglas y respuestas de Supabase.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] No confiar en el dominio enviado por cliente; verificar en backend.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir login válido, dominio inválido y usuario sin rol activo.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un profesor con correo `@mep.go.cr`, cuando ingrese credenciales correctas, entonces debe acceder a su área. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Dado un estudiante con correo `@est.mep.go.cr`, cuando ingrese credenciales correctas, entonces debe acceder a la app móvil. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Dado un correo cuyo dominio no corresponde con el rol asignado, cuando intente iniciar sesión, entonces el sistema debe rechazar el acceso. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Dado un usuario con credenciales incorrectas, cuando intente iniciar sesión, entonces debe recibir un mensaje de error sin revelar información sensible. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Después de autenticar, el sistema debe cargar el rol y centro vigentes para determinar permisos y navegación. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Login funcional en las plataformas requeridas por rol. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validación de dominio aplicada del lado servidor. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Perfil y roles disponibles tras autenticar. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Manejo de errores de Supabase Auth adaptado a la UX del producto. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de acceso por rol y dominio ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
