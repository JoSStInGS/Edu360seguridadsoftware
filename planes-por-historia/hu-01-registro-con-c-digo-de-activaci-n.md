# Plan de implementacion individual

## HU-01 - Registro con código de activación {#hu-01-registro-con-c-digo-de-activaci-n}

**Epica:** Épica A — Autenticación, acceso y vinculación familiar
**Prioridad:** Alta
**Historia de usuario:** Como usuario autorizado, quiero registrarme mediante un código de activación válido, para crear una cuenta vinculada correctamente a mi centro educativo y rol.
**Dependencias:** Ninguna
**Etiquetas:** auth, onboarding, activation-code, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe una base de registro con codigo en web y mobile, incluyendo `complete-profile`, `register.tsx` y validacion de codigo.
- Este plan no debe tratar HU-01 como flujo greenfield: primero hay que mapear el comportamiento actual y migrarlo de Firebase/Auth + Firestore hacia Supabase Auth + PostgreSQL.
- La implementacion nueva debe preservar la UX util que ya existe y corregir las brechas del backlog: expiracion de 72 horas, consumo unico transaccional, correo de verificacion y asociacion formal a centro/rol.

### Alcance funcional
- Validar existencia, expiración y uso único del código.
- Capturar los datos mínimos del usuario según rol.
- Asociar la cuenta al centro y rol autorizados.
- Enviar correo de verificación tras el registro satisfactorio.

### Fuera de alcance
- Creación manual masiva de usuarios.
- Recuperación de contraseña.
- Inicio de sesión posterior al registro.

### Tareas manuales o configuracion externa
- [ ] No se detectan tareas manuales externas obligatorias en la historia. Aun asi, el agente debe ejecutar una validacion manual antes de marcarla como Done.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir reglas de validez de códigos de activación y su relación con rol/centro.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Persistir códigos y consumo mediante PostgreSQL y Supabase Auth.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Adaptar los formularios de registro existentes en web/mobile para que trabajen con Supabase y cumplan los CA de HU-01.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Ejecutar el consumo del código en una operación server-side o Edge Function.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir expiración, reutilización, correo de verificación y alta válida.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un código vigente y no utilizado, cuando el usuario complete los datos requeridos, entonces el sistema debe permitir crear la cuenta. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Dado un código expirado después de 72 horas, cuando se intente usar, entonces el sistema debe rechazarlo con mensaje claro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Dado un código ya consumido, cuando se intente reutilizar, entonces el sistema debe impedir el registro. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: Cuando la cuenta se cree correctamente, entonces el sistema debe vincularla con el centro educativo y rol definidos en el código. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Cuando el registro finalice, entonces se debe enviar un correo de verificación al usuario. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo de registro disponible en web o móvil según el rol. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Validación de expiración y consumo implementada en backend transaccional. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Cuenta creada en Supabase Auth y perfil asociado en PostgreSQL. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Mensajería de error probada para código inválido, vencido y usado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas automatizadas para consumo único y asociación de rol/centro. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
