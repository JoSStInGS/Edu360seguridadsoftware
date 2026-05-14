# Plan de implementacion individual

## HU-34 - Inicio de sesión con Google OAuth en web y móvil {#hu-34-inicio-de-sesi-n-con-google-oauth-en-web-y-m-vil}

**Epica:** Épica A — Autenticación, acceso y vinculación familiar
**Prioridad:** Media
**Historia de usuario:** Como administrador o profesor autorizado, quiero iniciar sesión mediante Google OAuth en web y móvil cuando aplique, para acceder de forma más ágil sin perder las validaciones de rol y centro.
**Dependencias:** HU-02.; HU-16.
**Etiquetas:** auth, oauth, mobile-web, --

### Objetivo de implementacion
Implementar la historia completa respetando arquitectura y restricciones declaradas en el backlog.
El resultado esperado es que todos los criterios de aceptacion pasen, las tareas tecnicas queden terminadas y cada punto del DoD tenga evidencia verificable.

### Punto de partida y ajuste de enfoque
- Ya existe una base parcial de OAuth web en la capa de autenticacion actual, mientras que mobile requiere completar la integracion.
- HU-34 debe migrar esa intencion a Supabase Auth y callbacks web/mobile compatibles, validando luego rol, centro y estado activo.
- El plan no debe borrar el conocimiento ya codificado sobre el flujo actual; debe convertirlo en una implementacion coherente con el nuevo backend.

### Alcance funcional
- Autenticación Google OAuth para los roles permitidos.
- Compatibilidad con web y móvil.
- Resolución posterior de rol, centro y estado activo.
- Manejo de cancelación o error del proveedor.

### Fuera de alcance
- Otros proveedores SSO.
- Vinculación automática de cuentas no autorizadas.

### Tareas manuales o configuracion externa
- [ ] Confirmar manualmente la configuracion externa requerida: Definir compatibilidad entre identidad OAuth y roles válidos.
- [ ] Confirmar manualmente la configuracion externa requerida: Implementar `signInWithGoogleOAuth`.
- [ ] Confirmar manualmente la configuracion externa requerida: Configurar Supabase Auth y callbacks web/móvil.
- [ ] Confirmar manualmente la configuracion externa requerida: Incorporar acción OAuth en login web y móvil.

### Etapa 0 - Preparacion y lectura de contexto
- [ ] Leer esta HU completa, sus dependencias y el estado actual del repositorio antes de editar codigo.
- [ ] Localizar los modulos existentes de dominio, aplicacion, infraestructura, UI, pruebas y migraciones.
- [ ] Identificar patrones existentes para entidades, casos de uso, repositorios, validaciones, errores y componentes UI.
- [ ] Confirmar si las dependencias declaradas ya estan implementadas; si alguna falta, documentar el bloqueo y no simular comportamiento inexistente.
- [ ] Definir datos de prueba representativos y actores con/sin permisos cuando aplique.

### Etapa 1 - Dominio y reglas de negocio
- [ ] Definir compatibilidad entre identidad OAuth y roles válidos.
- [ ] Agregar o actualizar entidades, value objects, enums y errores necesarios.
- [ ] Cubrir reglas felices y transiciones invalidas con pruebas unitarias.

### Etapa 2 - Aplicacion, puertos y casos de uso
- [ ] Definir DTOs, contratos y errores controlados para el caso de uso.
- [ ] Agregar pruebas de aplicacion con dobles de puertos para exito, validacion y permisos.

### Etapa 3 - Infraestructura, datos y persistencia
- [ ] Configurar Supabase Auth y callbacks web/móvil.
- [ ] Crear o ajustar persistencia, migraciones, consultas, indices y transacciones cuando apliquen.
- [ ] Asegurar que los adaptadores no filtren detalles del proveedor a capas superiores.

### Etapa 4 - Frontend/UI y experiencia de usuario
- [ ] Incorporar acción OAuth en login web y móvil.
- [ ] Exponer el flujo con estados de carga, exito, vacio y error.
- [ ] Validar inputs y refrescar datos despues de mutaciones.

### Etapa 5 - Seguridad, permisos y aislamiento
- [ ] Verificar perfil y rol posteriores al retorno del proveedor.
- [ ] Validar permisos server-side y confirmar aislamiento entre contextos.
- [ ] No exponer secretos, tokens ni detalles internos en mensajes o logs.

### Etapa 6 - Pruebas automatizadas
- [ ] Cubrir éxito, cancelación, error y usuario sin rol activo.
- [ ] Ejecutar la suite relevante y registrar resultado.
- [ ] Corregir fallos introducidos por la historia antes del cierre.

### Etapa 7 - Validacion manual guiada
- [ ] Ejecutar el caso exitoso completo desde la UI o flujo principal.
- [ ] Ejecutar los escenarios negativos descritos en criterios de aceptacion.
- [ ] Repetir al menos una validacion con usuario sin permisos o contexto aislado cuando aplique.
- [ ] Confirmar que datos persistidos, eventos, estados y redirecciones coinciden con la HU.

### Etapa 8 - Verificacion contra criterios de aceptacion
- [ ] CA-01: Dado un administrador o profesor permitido, cuando complete OAuth correctamente, entonces debe acceder al sistema. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-02: Después de OAuth, el sistema debe validar rol, centro y dominio autorizado antes de conceder acceso. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-03: Si el usuario cancela el proceso o el proveedor devuelve error, la app debe mostrar un estado recuperable. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-04: El flujo debe funcionar en web y contemplar el soporte móvil definido por el roadmap técnico. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.
- [ ] CA-05: Un usuario autenticado por OAuth sin rol activo en Edu360 no debe entrar a módulos protegidos. | Evidencia requerida: prueba automatizada o paso manual documentado que demuestre este comportamiento.

### Etapa 9 - Cierre Definition of Done
- [ ] Flujo OAuth web operativo. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Integración móvil preparada conforme al stack Expo. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Resolución de perfil y rol implementada. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Manejo de errores del proveedor contemplado. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.
- [ ] Pruebas de acceso permitido y bloqueado ejecutadas. | Marcar solo con evidencia: PR, test, captura, migracion, log de comando o validacion manual.

### Checklist final para el agente
- [ ] No queda codigo muerto, TODOs bloqueantes ni mocks usados por la ruta productiva.
- [ ] Las migraciones, seeds y variables nuevas estan documentadas cuando apliquen.
- [ ] La solucion respeta las decisiones de arquitectura y seguridad establecidas.
- [ ] La historia puede demostrarse de punta a punta con datos limpios.
- [ ] Actualizar el backlog marcando tareas tecnicas, DoD y estado de la HU segun el avance real.
