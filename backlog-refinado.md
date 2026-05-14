# Backlog Refinado

## 1. Contexto del producto

Edu360 es una plataforma multi-institucional para colegios y escuelas K-12 del MEP de Costa Rica. Su objetivo es controlar asistencia institucional y por clase, conectar a encargados legales con los estudiantes, gestionar justificaciones y ausencias anticipadas, emitir alertas, generar reportes, administrar recursos educativos, operar un Classroom interno y registrar evaluaciones académicas con puntuaciones auditables.

El contexto técnico definido en el SRS v2.2 orienta este backlog:

- Web administrativa y docente con Next.js 15, React 19, Tailwind CSS v4, Radix UI y shadcn/ui.
- App móvil con Expo 54, React Native 0.81, Expo Router y React Navigation.
- Backend principal en Supabase/PostgreSQL con Auth, Storage, Realtime, Edge Functions y políticas Row Level Security.
- FCM como canal complementario para notificaciones push.
- Aislamiento multi-tenant por `center_id`, trazabilidad de cambios críticos y cumplimiento de la Ley 8968.

Roles principales:

- Super Administrador.
- Administrador de centro.
- Profesor.
- Estudiante.
- Encargado legal.

## 2. Supuestos utilizados

- Se preservan las 14 historias originales del PDF y se refinan una por una.
- Cuando una historia original contiene varios objetivos o requiere flujos complementarios obligatorios, se conserva la HU original y se agregan historias hijas o complementarias con nuevos IDs.
- Las historias nuevas provienen del SRS cuando completan un flujo funcional indispensable o resuelven un requisito de negocio explícito.
- Los componentes puramente técnicos del SRS se convierten en tareas técnicas y no en historias de usuario independientes, salvo cuando sostienen directamente una experiencia visible para el usuario.
- La importación de horarios desde aSc queda refinada funcionalmente aunque el formato exacto de exportación de aSc aún deba documentarse en un anexo técnico.
- Los flujos de QR se describen de forma agnóstica a si el token final será estático, dinámico o temporal, porque el propio SRS deja esa decisión para diseño de seguridad.
- La plataforma debe considerar estados vacíos, carga, error, no encontrado y acceso no autorizado en los módulos que lo requieran.

## 3. Resumen del refinamiento

| Métrica | Cantidad |
|---|---:|
| Épicas originales | 7 |
| Historias originales | 14 |
| Historias resultantes | 34 |
| Historias divididas | 5 |
| Historias agregadas | 20 |
| Historias movidas | 1 |
| Historias eliminadas | 0 |

## 4. Backlog refinado por épica

### Épica A — Autenticación, acceso y vinculación familiar

# HU-01 — Registro con código de activación

## Fuente original
- Épica original: Autenticación y Gestión de Acceso.
- Historia original: HU-01: Registro con Código de Activación.

## Evaluación
- Decisión: Reescribir.
- Motivo: La historia tiene valor claro, pero se completa con validación de rol, expiración, uso único y verificación de correo.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: Es el punto de entrada controlado para cualquier cuenta nueva.

## Historia refinada
Como usuario autorizado,
quiero registrarme mediante un código de activación válido,
para crear una cuenta vinculada correctamente a mi centro educativo y rol.

## Alcance funcional
- Validar existencia, expiración y uso único del código.
- Capturar los datos mínimos del usuario según rol.
- Asociar la cuenta al centro y rol autorizados.
- Enviar correo de verificación tras el registro satisfactorio.

## Fuera de alcance
- Creación manual masiva de usuarios.
- Recuperación de contraseña.
- Inicio de sesión posterior al registro.

## Criterios de aceptación
- CA-01: Dado un código vigente y no utilizado, cuando el usuario complete los datos requeridos, entonces el sistema debe permitir crear la cuenta.
- CA-02: Dado un código expirado después de 72 horas, cuando se intente usar, entonces el sistema debe rechazarlo con mensaje claro.
- CA-03: Dado un código ya consumido, cuando se intente reutilizar, entonces el sistema debe impedir el registro.
- CA-04: Cuando la cuenta se cree correctamente, entonces el sistema debe vincularla con el centro educativo y rol definidos en el código.
- CA-05: Cuando el registro finalice, entonces se debe enviar un correo de verificación al usuario.

## Definition of Done
- Flujo de registro disponible en web o móvil según el rol.
- Validación de expiración y consumo implementada en backend transaccional.
- Cuenta creada en Supabase Auth y perfil asociado en PostgreSQL.
- Mensajería de error probada para código inválido, vencido y usado.
- Pruebas automatizadas para consumo único y asociación de rol/centro.

## Tareas técnicas
### Dominio
- Definir reglas de validez de códigos de activación y su relación con rol/centro.
### Aplicación / Casos de uso
- Implementar caso de uso `registerWithActivationCode`.
### Infraestructura
- Persistir códigos y consumo mediante PostgreSQL y Supabase Auth.
### Frontend / UI
- Crear formulario de registro con estados de carga, éxito y error.
### Seguridad / Permisos
- Ejecutar el consumo del código en una operación server-side o Edge Function.
### Pruebas
- Cubrir expiración, reutilización, correo de verificación y alta válida.

## Prioridad sugerida
Alta

Reason: Sin este flujo no existe alta controlada de usuarios, una regla central del SRS.

## Dependencias
- Ninguna.

## Etiquetas sugeridas
- auth
- onboarding
- activation-code

---

# HU-02 — Inicio de sesión con dominios institucionales

## Fuente original
- Épica original: Autenticación y Gestión de Acceso.
- Historia original: HU-02: Inicio de Sesión con Dominios Institucionales.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva el objetivo principal de autenticación y se separa OAuth en una historia agregada específica.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: Es la puerta de acceso recurrente a la plataforma.

## Historia refinada
Como profesor, administrador o estudiante,
quiero iniciar sesión con credenciales válidas y un correo permitido para mi rol,
para acceder de forma segura a Edu360.

## Alcance funcional
- Inicio de sesión con correo y contraseña.
- Validación de dominio institucional según rol.
- Mensajes diferenciados para credenciales inválidas o dominio no permitido.
- Redirección al espacio funcional correspondiente al rol.

## Fuera de alcance
- Google OAuth.
- Recuperación de contraseña.
- Persistencia de sesión y expiración configurable.

## Criterios de aceptación
- CA-01: Dado un profesor con correo `@mep.go.cr`, cuando ingrese credenciales correctas, entonces debe acceder a su área.
- CA-02: Dado un estudiante con correo `@est.mep.go.cr`, cuando ingrese credenciales correctas, entonces debe acceder a la app móvil.
- CA-03: Dado un correo cuyo dominio no corresponde con el rol asignado, cuando intente iniciar sesión, entonces el sistema debe rechazar el acceso.
- CA-04: Dado un usuario con credenciales incorrectas, cuando intente iniciar sesión, entonces debe recibir un mensaje de error sin revelar información sensible.
- CA-05: Después de autenticar, el sistema debe cargar el rol y centro vigentes para determinar permisos y navegación.

## Definition of Done
- Login funcional en las plataformas requeridas por rol.
- Validación de dominio aplicada del lado servidor.
- Perfil y roles disponibles tras autenticar.
- Manejo de errores de Supabase Auth adaptado a la UX del producto.
- Pruebas de acceso por rol y dominio ejecutadas.

## Tareas técnicas
### Dominio
- Definir reglas de compatibilidad entre rol y dominio.
### Aplicación / Casos de uso
- Implementar `signInWithEmailPassword`.
### Infraestructura
- Integrar Supabase Auth y carga de `profiles` / `user_roles`.
### Frontend / UI
- Construir pantallas de login web y móvil con validaciones.
### Seguridad / Permisos
- No confiar en el dominio enviado por cliente; verificar en backend.
### Pruebas
- Cubrir login válido, dominio inválido y usuario sin rol activo.

## Prioridad sugerida
Alta

Reason: Es requisito base para acceder a cualquier módulo de Edu360.

## Dependencias
- HU-01.

## Etiquetas sugeridas
- auth
- login
- role-validation

---

# HU-34 — Inicio de sesión con Google OAuth en web y móvil

## Fuente original
- Épica original: Autenticación y Gestión de Acceso.
- Historia original: Fuente: Historia agregada por división derivada de HU-02.

## Evaluación
- Decisión: Agregar.
- Motivo: La autenticación mediante Google OAuth aparece en la HU-02 original y el SRS distingue su implementación en web y móvil.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: Es una variante de acceso del mismo dominio funcional de autenticación.

## Historia refinada
Como administrador o profesor autorizado,
quiero iniciar sesión mediante Google OAuth en web y móvil cuando aplique,
para acceder de forma más ágil sin perder las validaciones de rol y centro.

## Alcance funcional
- Autenticación Google OAuth para los roles permitidos.
- Compatibilidad con web y móvil.
- Resolución posterior de rol, centro y estado activo.
- Manejo de cancelación o error del proveedor.

## Fuera de alcance
- Otros proveedores SSO.
- Vinculación automática de cuentas no autorizadas.

## Criterios de aceptación
- CA-01: Dado un administrador o profesor permitido, cuando complete OAuth correctamente, entonces debe acceder al sistema.
- CA-02: Después de OAuth, el sistema debe validar rol, centro y dominio autorizado antes de conceder acceso.
- CA-03: Si el usuario cancela el proceso o el proveedor devuelve error, la app debe mostrar un estado recuperable.
- CA-04: El flujo debe funcionar en web y contemplar el soporte móvil definido por el roadmap técnico.
- CA-05: Un usuario autenticado por OAuth sin rol activo en Edu360 no debe entrar a módulos protegidos.

## Definition of Done
- Flujo OAuth web operativo.
- Integración móvil preparada conforme al stack Expo.
- Resolución de perfil y rol implementada.
- Manejo de errores del proveedor contemplado.
- Pruebas de acceso permitido y bloqueado ejecutadas.

## Tareas técnicas
### Dominio
- Definir compatibilidad entre identidad OAuth y roles válidos.
### Aplicación / Casos de uso
- Implementar `signInWithGoogleOAuth`.
### Infraestructura
- Configurar Supabase Auth y callbacks web/móvil.
### Frontend / UI
- Incorporar acción OAuth en login web y móvil.
### Seguridad / Permisos
- Verificar perfil y rol posteriores al retorno del proveedor.
### Pruebas
- Cubrir éxito, cancelación, error y usuario sin rol activo.

## Prioridad sugerida
Media

Reason: Está presente en la historia original y en el roadmap, pero no bloquea el login básico por credenciales.

## Dependencias
- HU-02.
- HU-16.

## Etiquetas sugeridas
- auth
- oauth
- mobile-web

---

# HU-03 — Vinculación de estudiantes a encargados legales

## Fuente original
- Épica original: Autenticación y Gestión de Acceso.
- Historia original: HU-03: Vinculación de Estudiantes a Encargados.

## Evaluación
- Decisión: Reescribir.
- Motivo: La historia se mantiene, pero se refuerza el consentimiento, la cardinalidad múltiple y la trazabilidad.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: La vinculación determina qué datos del estudiante puede consultar un encargado.

## Historia refinada
Como encargado legal,
quiero vincular uno o más estudiantes mediante códigos autorizados,
para consultar únicamente la información académica y de asistencia de quienes tengo a cargo.

## Alcance funcional
- Ingreso de código de vinculación.
- Asociación encargado-estudiante.
- Confirmación del vínculo creado.
- Registro del consentimiento informado de acceso a datos.

## Fuera de alcance
- Generación administrativa del código.
- Revocación o suspensión del vínculo.
- Gestión legal fuera del alcance del producto.

## Criterios de aceptación
- CA-01: Dado un código válido, cuando el encargado lo ingrese, entonces se debe crear el vínculo con el estudiante correspondiente.
- CA-02: Un encargado debe poder vincular múltiples estudiantes, y un estudiante puede tener múltiples encargados.
- CA-03: Si el código no existe, venció o ya no está activo, entonces el sistema debe impedir la vinculación.
- CA-04: Antes de finalizar, el sistema debe mostrar el consentimiento de tratamiento de datos y registrar su aceptación.
- CA-05: Después de vincular, el encargado solo debe visualizar datos de estudiantes asociados a su cuenta.

## Definition of Done
- Flujo móvil disponible para encargados.
- Tabla de relación `guardian_students` operativa.
- Consentimiento almacenado y recuperable.
- Reglas RLS verificadas para impedir accesos cruzados.
- Pruebas de múltiples vínculos y rechazo de acceso indebido.

## Tareas técnicas
### Dominio
- Modelar vínculo encargado-estudiante y estado activo.
### Aplicación / Casos de uso
- Implementar `linkGuardianToStudent`.
### Infraestructura
- Crear acceso transaccional a `guardian_students`.
### Frontend / UI
- Crear pantalla de vinculación con confirmación y estados de error.
### Seguridad / Permisos
- Aplicar RLS por relación autorizada.
### Pruebas
- Cubrir éxito, duplicidad, código inválido y acceso restringido.

## Prioridad sugerida
Alta

Reason: Sin vínculos confiables no funcionan los flujos de alertas, reportes ni seguimiento familiar.

## Dependencias
- HU-01.
- HU-24.

## Etiquetas sugeridas
- guardians
- privacy
- linking

---

# HU-15 — Recuperación y restablecimiento de contraseña

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige recuperación de contraseña y el flujo de acceso queda incompleto sin ella.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: Complementa el ciclo de vida de autenticación.

## Historia refinada
Como usuario registrado,
quiero solicitar y completar el restablecimiento de mi contraseña,
para recuperar el acceso cuando no la recuerdo.

## Alcance funcional
- Solicitud de recuperación por correo.
- Emisión de enlace o token de restablecimiento.
- Definición de nueva contraseña válida.
- Confirmación de éxito.

## Fuera de alcance
- Cambio preventivo de contraseña desde perfil.
- Soporte manual por administración.

## Criterios de aceptación
- CA-01: Dado un correo registrado, cuando el usuario solicite recuperación, entonces el sistema debe enviar instrucciones.
- CA-02: Dado un correo no reconocido, la respuesta no debe revelar si existe o no una cuenta.
- CA-03: Dado un enlace válido, cuando el usuario defina una nueva contraseña conforme a la política, entonces debe poder guardar el cambio.
- CA-04: Dado un enlace vencido o inválido, el sistema debe impedir el restablecimiento.
- CA-05: Tras completar el proceso, el usuario debe poder iniciar sesión con la nueva contraseña.

## Definition of Done
- Flujo integrado con Supabase Auth.
- Mensajes seguros ante correos no encontrados.
- Pantalla de nueva contraseña validada.
- Estados de enlace vencido contemplados.
- Pruebas funcionales de solicitud y confirmación.

## Tareas técnicas
### Dominio
- Definir política de contraseña aceptada por el producto.
### Aplicación / Casos de uso
- Orquestar solicitud y confirmación de recuperación.
### Infraestructura
- Integrar templates y callbacks de Supabase Auth.
### Frontend / UI
- Construir pantallas de solicitud y reset.
### Seguridad / Permisos
- Evitar enumeración de usuarios.
### Pruebas
- Probar flujo exitoso, expiración y feedback no revelador.

## Prioridad sugerida
Alta

Reason: Reduce bloqueos de acceso y es requisito explícito del SRS.

## Dependencias
- HU-02.

## Etiquetas sugeridas
- auth
- password-reset
- account-recovery

---

# HU-16 — Sesión segura, cierre de sesión y acceso protegido

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige expiración por inactividad, validación JWT y control de rutas protegidas.
- Épica actual: Autenticación, acceso y vinculación familiar.
- Épica sugerida: Autenticación, acceso y vinculación familiar.
- Motivo de ubicación: Asegura que el acceso autenticado se mantenga controlado durante toda la sesión.

## Historia refinada
Como usuario autenticado,
quiero mantener una sesión segura y poder cerrarla cuando lo decida,
para proteger mi información y evitar accesos indebidos.

## Alcance funcional
- Persistencia de sesión autenticada.
- Expiración por inactividad configurable.
- Cierre de sesión explícito.
- Protección de rutas y pantallas por rol.

## Fuera de alcance
- Administración de sesiones en múltiples dispositivos.
- MFA.

## Criterios de aceptación
- CA-01: Dado un usuario autenticado, cuando navegue entre módulos permitidos, entonces su sesión debe mantenerse válida.
- CA-02: Dado un tiempo de inactividad superior al configurado, cuando el usuario vuelva a interactuar, entonces el sistema debe solicitar autenticación nuevamente.
- CA-03: Cuando el usuario cierre sesión, entonces se deben limpiar credenciales locales y redirigir al login.
- CA-04: Dado un usuario sin permiso, cuando intente acceder a una ruta restringida, entonces debe recibir estado de acceso denegado.
- CA-05: Todo endpoint server-side protegido debe validar el JWT de Supabase antes de procesar la solicitud.

## Definition of Done
- Guards de rutas web y móvil configurados.
- Cierre de sesión consistente entre clientes.
- Expiración por inactividad aplicada.
- Validación server-side de tokens verificada.
- Pruebas de acceso autorizado y no autorizado.

## Tareas técnicas
### Dominio
- Definir estados de sesión y permisos por contexto.
### Aplicación / Casos de uso
- Crear flujo de logout y chequeo de sesión vigente.
### Infraestructura
- Integrar helpers SSR de Supabase y validación JWT en Edge Functions.
### Frontend / UI
- Implementar rutas protegidas, loaders y pantalla de acceso denegado.
### Seguridad / Permisos
- Rechazar sesiones expiradas o tokens inválidos en backend.
### Pruebas
- Cubrir expiración, logout y acceso prohibido.

## Prioridad sugerida
Alta

Reason: Es la base de seguridad operativa para todos los módulos posteriores.

## Dependencias
- HU-02.

## Etiquetas sugeridas
- security
- session
- protected-routes

---

### Épica B — Control de acceso institucional por QR

# HU-04 — Generación segura de identificador QR

## Fuente original
- Épica original: Control de Acceso Institucional (QR).
- Historia original: HU-04: Generación de Identificador QR.

## Evaluación
- Decisión: Reescribir.
- Motivo: La historia se enfoca en la experiencia del estudiante y se deja el registro de salida en una historia separada.
- Épica actual: Control de acceso institucional por QR.
- Épica sugerida: Control de acceso institucional por QR.
- Motivo de ubicación: Es la capacidad previa a registrar ingreso o salida.

## Historia refinada
Como estudiante,
quiero visualizar un identificador QR seguro desde mi app,
para presentarlo en el punto de control institucional sin exponer mis datos personales.

## Alcance funcional
- Mostrar QR asociado a la identidad interna del estudiante.
- Ocultar datos personales directos dentro del código.
- Preparar una vista móvil clara y legible para escaneo.
- Indicar que el QR corresponde a una operación de acceso institucional.

## Fuera de alcance
- Validación del escaneo.
- Registro del evento de entrada o salida.

## Criterios de aceptación
- CA-01: Dado un estudiante autenticado, cuando abra la sección de acceso, entonces debe visualizar un QR disponible para escaneo.
- CA-02: El contenido del QR no debe incluir nombre, cédula, correo ni datos personales directos.
- CA-03: El QR debe representar un identificador interno cifrado, tokenizado o temporal según el diseño aprobado.
- CA-04: Si el QR no puede generarse, la app debe mostrar un estado de error recuperable.
- CA-05: La vista debe ser utilizable en móvil y mantenerse legible bajo condiciones normales de brillo y tamaño de pantalla.

## Definition of Done
- Pantalla móvil de QR lista.
- Estrategia de token seguro definida e implementada.
- Sin exposición directa de PII en el payload.
- Estados de carga y error contemplados.
- Pruebas de generación y renderizado realizadas.

## Tareas técnicas
### Dominio
- Modelar representación segura del identificador de acceso.
### Aplicación / Casos de uso
- Implementar `getStudentAccessQr`.
### Infraestructura
- Resolver emisión o lectura del token vía Supabase / Edge Function.
### Frontend / UI
- Crear vista móvil de QR con tratamiento de error.
### Seguridad / Permisos
- Validar que solo el estudiante autenticado obtiene su propio QR.
### Pruebas
- Verificar no exposición de PII y comportamiento ante falla.

## Prioridad sugerida
Alta

Reason: Es la interfaz esencial para habilitar el control de ingreso y salida.

## Dependencias
- HU-02.
- HU-16.

## Etiquetas sugeridas
- qr
- student-app
- privacy

---

# HU-05 — Registro de ingreso y estado "Activo en sede"

## Fuente original
- Épica original: Control de Acceso Institucional (QR).
- Historia original: HU-05: Registro de Estado "Activo en Sede".

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva el objetivo y se explicita la bitácora de acceso, notificación y manejo de reingreso.
- Épica actual: Control de acceso institucional por QR.
- Épica sugerida: Control de acceso institucional por QR.
- Motivo de ubicación: Registra el inicio de presencia física del estudiante.

## Historia refinada
Como institución,
quiero registrar el ingreso de un estudiante a partir del escaneo de su QR,
para mantener actualizado su estado de presencia en sede y comunicarlo al encargado legal.

## Alcance funcional
- Validación del QR presentado.
- Registro del evento de ingreso con timestamp.
- Cambio de estado a `Activo en sede`.
- Notificación inmediata al encargado legal.
- Confirmación antes de reingresar si ya estaba activo.

## Fuera de alcance
- Salida del estudiante.
- Tableros analíticos de asistencia.

## Criterios de aceptación
- CA-01: Dado un QR válido de ingreso, cuando el lector lo escanee, entonces se debe crear un registro de acceso con timestamp.
- CA-02: Tras registrar el ingreso, el estudiante debe quedar con estado `Activo en sede`.
- CA-03: Cuando el ingreso se confirme, el encargado legal debe recibir una notificación push y/o correo según configuración.
- CA-04: Si el estudiante ya está `Activo en sede`, el sistema debe advertir y solicitar confirmación antes de registrar otro ingreso.
- CA-05: Si el QR es inválido o no autorizado, el sistema debe rechazar el evento sin modificar el estado del estudiante.

## Definition of Done
- Flujo de escaneo soportado en el dispositivo lector definido.
- Tabla `access_logs` actualizada con trazabilidad.
- Actualización de estado reflejada en backend.
- Notificación integrada con cola o disparador server-side.
- Pruebas de reingreso, invalidez y éxito realizadas.

## Tareas técnicas
### Dominio
- Definir transición de estado `Fuera de sede` -> `Activo en sede`.
### Aplicación / Casos de uso
- Implementar `registerStudentEntry`.
### Infraestructura
- Persistir evento y estado con transacción.
### Frontend / UI
- Crear feedback de escaneo aceptado, duplicado o rechazado.
### Seguridad / Permisos
- Validar token del lector y no permitir altas manuales no autorizadas.
### Pruebas
- Cubrir ingreso válido, duplicado y QR inválido.

## Prioridad sugerida
Alta

Reason: Es uno de los flujos centrales declarados en el alcance del sistema.

## Dependencias
- HU-04.
- HU-23.

## Etiquetas sugeridas
- qr
- access-control
- notifications

---

# HU-17 — Registro de salida y estado "Fuera de sede"

## Fuente original
- Épica original: Control de Acceso Institucional (QR).
- Historia original: Fuente: Historia agregada por división y flujo faltante derivado de HU-04.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS incluye flujo explícito de salida institucional y no debe quedar implícito dentro de la visualización del QR.
- Épica actual: Control de acceso institucional por QR.
- Épica sugerida: Control de acceso institucional por QR.
- Motivo de ubicación: Completa el ciclo de presencia física del estudiante.

## Historia refinada
Como institución,
quiero registrar la salida del estudiante mediante el escaneo de su QR de salida,
para reflejar que ya no se encuentra dentro del centro educativo.

## Alcance funcional
- Selección de modo salida en la app del estudiante.
- Escaneo y validación del identificador.
- Registro del evento de salida.
- Cambio de estado a `Fuera de sede`.
- Notificación opcional al encargado.

## Fuera de alcance
- Reglas de salida anticipada por clase.
- Reportes agregados de movilidad.

## Criterios de aceptación
- CA-01: Dado un estudiante autenticado, cuando seleccione registrar salida, entonces la app debe mostrar el QR aplicable.
- CA-02: Dado un QR de salida válido, cuando sea escaneado, entonces se debe registrar el evento de salida con timestamp.
- CA-03: Tras registrar la salida, el estado global del estudiante debe cambiar a `Fuera de sede`.
- CA-04: Si la institución tiene habilitada la notificación de salida, entonces el encargado legal debe recibirla.
- CA-05: Si el estudiante ya está `Fuera de sede`, el sistema debe evitar duplicar el evento o solicitar confirmación según la regla aprobada.

## Definition of Done
- Modo salida disponible en la app móvil.
- Persistencia del evento y transición de estado probadas.
- Configuración de notificación opcional considerada.
- Manejo de duplicidad o incoherencia definido.
- Pruebas de fin de jornada ejecutadas.

## Tareas técnicas
### Dominio
- Definir transición `Activo en sede` -> `Fuera de sede`.
### Aplicación / Casos de uso
- Implementar `registerStudentExit`.
### Infraestructura
- Actualizar `access_logs` y estado con operación transaccional.
### Frontend / UI
- Incorporar selector visual entre ingreso y salida.
### Seguridad / Permisos
- Validar que el QR de salida corresponda al estudiante autenticado.
### Pruebas
- Cubrir salida válida, estado ya cerrado y notificación opcional.

## Prioridad sugerida
Alta

Reason: Sin salida registrada, el estado global de presencia queda incompleto.

## Dependencias
- HU-04.
- HU-05.

## Etiquetas sugeridas
- qr
- checkout
- student-presence

---

# HU-18 — Historial de ingresos y listado de estudiantes activos

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige historial visible para administración y encargados, además de vista en tiempo real de estudiantes activos.
- Épica actual: Control de acceso institucional por QR.
- Épica sugerida: Control de acceso institucional por QR.
- Motivo de ubicación: Hace operable el resultado de los escaneos.

## Historia refinada
Como administrador o encargado legal autorizado,
quiero consultar los registros de ingreso y salida relevantes,
para supervisar presencia institucional y trazabilidad de movimientos.

## Alcance funcional
- Historial por estudiante.
- Listado de estudiantes `Activos en sede` para administrador.
- Filtros básicos por fecha y estudiante.
- Acceso restringido por rol y relación.

## Fuera de alcance
- Métricas avanzadas de tráfico institucional.
- Exportación específica de logs de acceso.

## Criterios de aceptación
- CA-01: El administrador debe visualizar estudiantes activos en sede de su propio centro.
- CA-02: El encargado legal debe visualizar el historial de ingreso y salida solo de estudiantes vinculados.
- CA-03: El historial debe mostrar tipo de evento, fecha y hora.
- CA-04: Los cambios de estado recientes deben reflejarse oportunamente en la vista administrativa.
- CA-05: Un usuario sin permisos no debe acceder a logs de otro centro ni de estudiantes no vinculados.

## Definition of Done
- Vistas de consulta implementadas para admin y encargado.
- Realtime o estrategia de refresco definida para activos en sede.
- Filtros funcionales.
- RLS validada por rol y vínculo.
- Pruebas de visibilidad segmentada ejecutadas.

## Tareas técnicas
### Dominio
- Definir consultas de historial y presencia vigente.
### Aplicación / Casos de uso
- Crear `getAccessHistory` y `getActiveStudents`.
### Infraestructura
- Optimizar consultas sobre `access_logs`.
### Frontend / UI
- Diseñar tablas/listas responsive con estados vacíos y loading.
### Seguridad / Permisos
- Aplicar scopes por `center_id` y `guardian_students`.
### Pruebas
- Probar consultas autorizadas y bloqueadas.

## Prioridad sugerida
Media

Reason: Hace útil la captura de accesos y soporta supervisión operativa.

## Dependencias
- HU-05.
- HU-17.

## Etiquetas sugeridas
- access-history
- admin-dashboard
- guardians

---

### Épica C — Asistencia por clase

# HU-06 — Toma de asistencia por clase

## Fuente original
- Épica original: Registro de Asistencia por Clase.
- Historia original: HU-06: Toma de Asistencia por Clase.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se mantiene el flujo principal y se separan la modificación posterior y la alerta de incumplimiento en historias complementarias.
- Épica actual: Asistencia por clase.
- Épica sugerida: Asistencia por clase.
- Motivo de ubicación: Es el núcleo del seguimiento académico diario.

## Historia refinada
Como profesor asignado,
quiero registrar el estado de asistencia de mis estudiantes por clase,
para documentar presencia, puntualidad y novedades de cada lección.

## Alcance funcional
- Selección de clase y grupo según horario.
- Carga de estudiantes de sección o subgrupo.
- Registro de estados: Presente, Ausente, Tardía, Salida Anticipada y Ausencia Justificada.
- Guardado del registro con timestamp y autor.

## Fuera de alcance
- Modificación posterior del registro.
- Alertas de atraso en toma de asistencia.

## Criterios de aceptación
- CA-01: Dado un profesor asignado a una materia, cuando abra una clase vigente, entonces debe ver la lista correcta de estudiantes.
- CA-02: El profesor debe poder asignar uno de los estados permitidos a cada estudiante.
- CA-03: Al guardar, el sistema debe persistir el registro con usuario responsable y marca de tiempo.
- CA-04: Un profesor no asignado a la materia no debe registrar asistencia.
- CA-05: En fechas definidas como feriado, el sistema no debe permitir crear registros de asistencia.

## Definition of Done
- Flujo disponible en web y móvil para profesor.
- Estados completos del SRS implementados.
- Auditoría mínima de autor y fecha incluida.
- Validación de profesor/materia y calendario escolar aplicada.
- Pruebas de asistencia por sección y subgrupo ejecutadas.

## Tareas técnicas
### Dominio
- Modelar `attendance_records` y reglas de estados permitidos.
### Aplicación / Casos de uso
- Implementar `recordClassAttendance`.
### Infraestructura
- Consultar horarios, estudiantes y persistir registros en PostgreSQL.
### Frontend / UI
- Crear experiencia ágil de marcado masivo y edición rápida antes de guardar.
### Seguridad / Permisos
- RLS por profesor, centro y asignación de materia.
### Pruebas
- Cubrir grupo válido, grupo ajeno, feriado y persistencia.

## Prioridad sugerida
Alta

Reason: Es uno de los flujos principales del producto y una promesa central de Edu360.

## Dependencias
- HU-02.
- HU-25.

## Etiquetas sugeridas
- attendance
- teacher
- core-flow

---

# HU-19 — Modificación controlada de asistencia del mismo día

## Fuente original
- Épica original: Registro de Asistencia por Clase.
- Historia original: Fuente: Historia agregada por división derivada de HU-06.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS establece modificación del mismo día, con auditoría, y eso requiere criterios propios.
- Épica actual: Asistencia por clase.
- Épica sugerida: Asistencia por clase.
- Motivo de ubicación: Es una extensión directa del registro de asistencia.

## Historia refinada
Como profesor asignado,
quiero corregir un registro de asistencia dentro del plazo permitido,
para reflejar ajustes válidos ocurridos durante la jornada.

## Alcance funcional
- Edición de registros del mismo día.
- Restricción por clase propia y ventana temporal permitida.
- Registro de quién modificó y cuándo.
- Conservación de trazabilidad para auditoría.

## Fuera de alcance
- Cambios históricos fuera de la jornada.
- Ediciones por parte del administrador.

## Criterios de aceptación
- CA-01: Dado un registro de una clase propia del mismo día, cuando el profesor lo edite, entonces el sistema debe permitir guardar el cambio.
- CA-02: Si la edición ocurre fuera de la ventana permitida, entonces el sistema debe bloquearla.
- CA-03: Si un administrador intenta modificar asistencia, el sistema debe impedirlo.
- CA-04: Toda modificación debe conservar el autor, la fecha y el valor actualizado.
- CA-05: La vista debe mostrar el estado vigente luego de la corrección.

## Definition of Done
- Edición temporalmente restringida implementada.
- Auditoría de cambios disponible.
- Permisos diferenciados entre profesor y admin.
- Mensajes de error claros.
- Pruebas de límites temporales y permisos ejecutadas.

## Tareas técnicas
### Dominio
- Definir ventana de edición de asistencia.
### Aplicación / Casos de uso
- Implementar `updateAttendanceRecord`.
### Infraestructura
- Registrar auditoría o delta de cambios críticos.
### Frontend / UI
- Incorporar edición contextual desde la clase.
### Seguridad / Permisos
- Impedir mutaciones por roles no autorizados.
### Pruebas
- Cubrir edición válida, fuera de plazo y rol no permitido.

## Prioridad sugerida
Alta

Reason: Reduce correcciones manuales fuera del sistema y mejora la confiabilidad del dato.

## Dependencias
- HU-06.

## Etiquetas sugeridas
- attendance
- audit
- teacher-tools

---

# HU-20 — Alerta por asistencia no registrada en 15 minutos

## Fuente original
- Épica original: Registro de Asistencia por Clase.
- Historia original: Fuente: Historia agregada por división derivada de HU-06.

## Evaluación
- Decisión: Agregar.
- Motivo: La alerta tiene actor, disparador y valor operativo propios.
- Épica actual: Asistencia por clase.
- Épica sugerida: Asistencia por clase.
- Motivo de ubicación: Supervisa el cumplimiento del registro docente.

## Historia refinada
Como administrador,
quiero recibir una alerta cuando una clase no tenga asistencia registrada dentro de los primeros 15 minutos,
para actuar oportunamente ante omisiones de control.

## Alcance funcional
- Detección de clases vencidas sin registro.
- Generación de alerta al administrador.
- Evitar duplicación innecesaria de alertas.
- Consulta posterior del evento.

## Fuera de alcance
- Sanciones o gestión disciplinaria.
- Reasignación automática de docentes.

## Criterios de aceptación
- CA-01: Dada una clase iniciada, cuando transcurran 15 minutos sin asistencia guardada, entonces se debe generar una alerta.
- CA-02: La alerta debe dirigirse al administrador del centro correspondiente.
- CA-03: Si la asistencia ya fue registrada antes del vencimiento, no se debe emitir alerta.
- CA-04: La alerta debe incluir clase, profesor, horario y centro.
- CA-05: El sistema debe evitar generar múltiples alertas idénticas para el mismo evento.

## Definition of Done
- Regla temporal implementada de forma confiable.
- Notificación y persistencia del evento disponibles.
- Datos contextuales suficientes para actuar.
- Idempotencia o deduplicación contemplada.
- Pruebas de disparo y no disparo ejecutadas.

## Tareas técnicas
### Dominio
- Definir condición de incumplimiento de registro.
### Aplicación / Casos de uso
- Implementar `notifyMissingAttendance`.
### Infraestructura
- Ejecutar scheduler, job o Edge Function según arquitectura.
### Frontend / UI
- Mostrar la alerta en centro de notificaciones o dashboard.
### Seguridad / Permisos
- Restringir visibilidad de la alerta al centro correspondiente.
### Pruebas
- Cubrir emisión, deduplicación y clase ya atendida.

## Prioridad sugerida
Alta

Reason: Es una regla de negocio explícita y una alerta operativa clave.

## Dependencias
- HU-06.
- HU-23.

## Etiquetas sugeridas
- attendance-alerts
- notifications
- admin

---

### Épica D — Solicitudes de ausencia y justificaciones

# HU-07 — Envío de justificación de ausencia

## Fuente original
- Épica original: Justificaciones y Solicitudes de Ausencia.
- Historia original: HU-07: Envío de Justificación de Ausencia.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se preserva el objetivo y se refuerza el cálculo de días hábiles, adjuntos y validación de calendario.
- Épica actual: Solicitudes de ausencia y justificaciones.
- Épica sugerida: Solicitudes de ausencia y justificaciones.
- Motivo de ubicación: Atiende ausencias ya ocurridas.

## Historia refinada
Como encargado legal,
quiero justificar una ausencia ya registrada y adjuntar respaldo,
para cumplir el reglamento institucional dentro del plazo permitido.

## Alcance funcional
- Selección del estudiante vinculado y ausencia elegible.
- Captura de motivo y adjunto PDF o imagen.
- Validación de máximo 3 días hábiles.
- Envío al profesor correspondiente.

## Fuera de alcance
- Solicitudes de ausencia futura.
- Resolución de la solicitud por el profesor.

## Criterios de aceptación
- CA-01: Dada una ausencia reciente dentro de 3 días hábiles, cuando el encargado complete el formulario, entonces debe poder enviarla.
- CA-02: El cálculo de plazo debe excluir feriados configurados en el calendario escolar.
- CA-03: Si el plazo expiró, el sistema debe impedir el envío y explicar el motivo.
- CA-04: El sistema debe aceptar únicamente formatos de archivo permitidos para respaldo.
- CA-05: Tras enviar, la solicitud debe quedar con estado pendiente y notificarse al profesor correspondiente.

## Definition of Done
- Flujo móvil de justificación disponible.
- Validación de plazo hábil y feriados integrada.
- Storage configurado para adjuntos protegidos.
- Estado inicial y notificación creados.
- Pruebas de plazo, formatos y vínculo familiar ejecutadas.

## Tareas técnicas
### Dominio
- Definir reglas de elegibilidad y ventana hábil.
### Aplicación / Casos de uso
- Implementar `submitAbsenceJustification`.
### Infraestructura
- Guardar adjuntos en Supabase Storage y metadata en PostgreSQL.
### Frontend / UI
- Crear formulario con selector de estudiante, ausencia y archivo.
### Seguridad / Permisos
- Validar vínculo encargado-estudiante y Storage policies.
### Pruebas
- Cubrir fecha válida, fecha expirada, feriado y archivo inválido.

## Prioridad sugerida
Alta

Reason: Es un flujo regulatorio y de comunicación familiar central.

## Dependencias
- HU-03.
- HU-06.
- HU-25.

## Etiquetas sugeridas
- absences
- guardian-app
- storage

---

# HU-08 — Aprobación o rechazo de justificaciones

## Fuente original
- Épica original: Justificaciones y Solicitudes de Ausencia.
- Historia original: HU-08: Aprobación de Justificaciones.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva y se precisa la competencia del profesor por materia y el efecto automático sobre asistencia.
- Épica actual: Solicitudes de ausencia y justificaciones.
- Épica sugerida: Solicitudes de ausencia y justificaciones.
- Motivo de ubicación: Cierra el ciclo de justificación.

## Historia refinada
Como profesor responsable de la materia,
quiero aprobar o rechazar justificaciones pendientes,
para actualizar correctamente la asistencia y comunicar el resultado al encargado.

## Alcance funcional
- Bandeja de solicitudes pendientes por materia.
- Dictamen aprobado o rechazado.
- Actualización automática del estado de asistencia cuando aplique.
- Notificación del resultado al encargado legal.

## Fuera de alcance
- Modificación directa de la solicitud enviada.
- Revisión por administrador con capacidad de decisión.

## Criterios de aceptación
- CA-01: El profesor debe visualizar únicamente solicitudes asociadas a materias que imparte.
- CA-02: Al aprobar una justificación, la asistencia correspondiente debe pasar a `Ausencia Justificada`.
- CA-03: Al rechazarla, la solicitud debe quedar con estado rechazado sin cambiar la asistencia.
- CA-04: El encargado legal debe recibir notificación del resultado.
- CA-05: La decisión debe quedar trazada con profesor, fecha y estado final.

## Definition of Done
- Bandeja de revisión disponible web/móvil.
- Permisos por profesor/materia aplicados.
- Actualización automática de asistencia implementada.
- Notificaciones integradas.
- Pruebas de aprobación, rechazo y acceso indebido completadas.

## Tareas técnicas
### Dominio
- Modelar estados de solicitud y efectos en asistencia.
### Aplicación / Casos de uso
- Implementar `reviewAbsenceRequest`.
### Infraestructura
- Ejecutar cambio de solicitud y asistencia de forma transaccional.
### Frontend / UI
- Crear interfaz de dictamen con detalle del adjunto.
### Seguridad / Permisos
- Aplicar RLS para profesor de la materia.
### Pruebas
- Probar aprobación, rechazo y mutación automática de estado.

## Prioridad sugerida
Alta

Reason: La justificación sin resolución no genera valor operativo.

## Dependencias
- HU-07.
- HU-06.
- HU-23.

## Etiquetas sugeridas
- approvals
- attendance
- notifications

---

# HU-21 — Solicitud de ausencia anticipada

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS define este flujo como distinto de la justificación posterior.
- Épica actual: Solicitudes de ausencia y justificaciones.
- Épica sugerida: Solicitudes de ausencia y justificaciones.
- Motivo de ubicación: Atiende ausencias futuras antes de que ocurra la clase.

## Historia refinada
Como encargado legal,
quiero solicitar una ausencia futura para uno o varios días,
para informar anticipadamente al centro educativo sobre la no asistencia del estudiante.

## Alcance funcional
- Selección de estudiante vinculado.
- Selección de fecha o rango futuro.
- Motivo y adjunto opcional según política.
- Envío a los profesores de materias afectadas.

## Fuera de alcance
- Resolución de la solicitud.
- Justificación de ausencias ya ocurridas.

## Criterios de aceptación
- CA-01: El encargado debe poder crear una solicitud de ausencia para fechas futuras o incluso el mismo día, según la regla del SRS.
- CA-02: El sistema debe identificar materias afectadas en las fechas solicitadas.
- CA-03: La solicitud debe enviarse a los profesores correspondientes.
- CA-04: El encargado debe visualizar confirmación de creación y estado pendiente.
- CA-05: Usuarios no vinculados al estudiante no deben crear solicitudes en su nombre.

## Definition of Done
- Flujo móvil disponible para fechas futuras.
- Asociación con materias afectadas calculada.
- Estado inicial y notificaciones generados.
- Permisos por vínculo aplicados.
- Pruebas con rango simple y múltiple realizadas.

## Tareas técnicas
### Dominio
- Definir estructura de ausencia anticipada y relación con horario.
### Aplicación / Casos de uso
- Implementar `createAdvanceAbsenceRequest`.
### Infraestructura
- Consultar `schedules` y persistir solicitudes por materia afectada.
### Frontend / UI
- Crear formulario de fechas con resumen del impacto.
### Seguridad / Permisos
- Validar vínculo familiar activo.
### Pruebas
- Cubrir fecha futura, mismo día y múltiples materias.

## Prioridad sugerida
Alta

Reason: Es requisito explícito y complementa el ciclo de gestión de ausencias.

## Dependencias
- HU-03.
- HU-25.
- HU-23.

## Etiquetas sugeridas
- absences
- guardians
- scheduling

---

# HU-22 — Historial de solicitudes y consulta administrativa

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige historial completo para encargados y consulta administrativa de solo lectura.
- Épica actual: Solicitudes de ausencia y justificaciones.
- Épica sugerida: Solicitudes de ausencia y justificaciones.
- Motivo de ubicación: Ofrece trazabilidad y seguimiento del trámite.

## Historia refinada
Como encargado legal o administrador autorizado,
quiero consultar el estado e historial de solicitudes de ausencia,
para dar seguimiento a los trámites sin modificar decisiones ya tomadas.

## Alcance funcional
- Historial por estudiante vinculado para encargados.
- Consulta global de centro en modo lectura para administrador.
- Estados pendiente, aprobada y rechazada.
- Filtros por fechas, estudiante y estado.

## Fuera de alcance
- Edición o cancelación de solicitudes.
- Reapertura del dictamen.

## Criterios de aceptación
- CA-01: El encargado debe visualizar solo solicitudes de sus estudiantes vinculados.
- CA-02: El administrador debe visualizar solicitudes de su centro en modo lectura.
- CA-03: El historial debe mostrar estado, fechas, tipo de solicitud y resolución cuando exista.
- CA-04: Los filtros deben permitir localizar solicitudes por estudiante y estado.
- CA-05: Un usuario sin permisos no debe consultar solicitudes de otro centro.

## Definition of Done
- Vistas diferenciadas para encargado y administrador.
- Consultas paginadas o eficientes para listados.
- Estados legibles y consistentes.
- RLS probada.
- Pruebas de filtros y segmentación completadas.

## Tareas técnicas
### Dominio
- Definir proyección de historial de solicitudes.
### Aplicación / Casos de uso
- Implementar `listAbsenceRequests`.
### Infraestructura
- Crear consultas optimizadas sobre `absence_requests`.
### Frontend / UI
- Construir listas con badges de estado y filtros.
### Seguridad / Permisos
- Restringir por centro y vínculo familiar.
### Pruebas
- Cubrir historial de encargado, consulta admin y acceso bloqueado.

## Prioridad sugerida
Media

Reason: Mejora transparencia del flujo y reduce consultas manuales fuera del sistema.

## Dependencias
- HU-07.
- HU-08.
- HU-21.

## Etiquetas sugeridas
- absences
- history
- admin-readonly

---

### Épica E — Recursos educativos y Classroom

# HU-09 — Publicación de recursos educativos

## Fuente original
- Épica original: Módulos Académicos (Recursos y Classroom).
- Historia original: HU-09: Publicación de Recursos Educativos.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se preserva la carga de recursos y se deja la consulta posterior en una historia separada.
- Épica actual: Recursos educativos y Classroom.
- Épica sugerida: Recursos educativos y Classroom.
- Motivo de ubicación: Es el flujo de creación de contenido académico.

## Historia refinada
Como profesor,
quiero publicar recursos educativos asociados a una materia, sección o subgrupo,
para centralizar materiales de estudio disponibles para mis estudiantes autorizados.

## Alcance funcional
- Carga de documentos, presentaciones y enlaces externos.
- Definición de título, descripción, tipo y visibilidad.
- Asociación con materia, sección o subgrupo.
- Registro de autor y fecha de carga.

## Fuera de alcance
- Consulta por parte de estudiantes y encargados.
- Edición o retiro administrativo posterior.

## Criterios de aceptación
- CA-01: El profesor debe poder crear un recurso asociado a una materia o grupo que le pertenezca.
- CA-02: El sistema debe soportar al menos PDF, documentos ofimáticos, presentaciones y enlaces externos.
- CA-03: El profesor debe definir el alcance del recurso antes de publicarlo.
- CA-04: El recurso publicado debe almacenar autor, fecha, destino y tipo.
- CA-05: Si el archivo excede restricciones configuradas o falla la carga, el sistema debe informar el error.

## Definition of Done
- Flujo de publicación disponible.
- Storage y metadatos persistidos correctamente.
- Validación de pertenencia docente aplicada.
- Mensajes de error de carga contemplados.
- Pruebas de archivos y destino académico ejecutadas.

## Tareas técnicas
### Dominio
- Modelar `educational_resources` y reglas de visibilidad.
### Aplicación / Casos de uso
- Implementar `publishEducationalResource`.
### Infraestructura
- Guardar archivo en Supabase Storage y registro en PostgreSQL.
### Frontend / UI
- Crear formulario de publicación con selector de alcance.
### Seguridad / Permisos
- Storage policies por centro, materia y propietario.
### Pruebas
- Cubrir publicación válida, materia ajena y archivo rechazado.

## Prioridad sugerida
Media

Reason: Es módulo académico relevante, pero depende de la base de seguridad y asignaciones.

## Dependencias
- HU-25.
- HU-16.

## Etiquetas sugeridas
- resources
- teacher
- storage

---

# HU-10 — Entrega de tareas con historial de envío

## Fuente original
- Épica original: Módulos Académicos (Recursos y Classroom).
- Historia original: HU-10: Entrega de Tareas y Seguimiento.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva la entrega estudiantil y se separan creación de tareas y revisión docente en historias propias.
- Épica actual: Recursos educativos y Classroom.
- Épica sugerida: Recursos educativos y Classroom.
- Motivo de ubicación: Representa la acción principal del estudiante dentro del Classroom.

## Historia refinada
Como estudiante,
quiero entregar una tarea mediante archivo, texto o ambos,
para cumplir con mis obligaciones académicas y conservar evidencia de envío.

## Alcance funcional
- Visualización de tarea asignada.
- Envío de evidencia según configuración docente.
- Registro de fecha y hora de entrega.
- Marcado automático de entrega tardía.
- Conservación del historial de envíos.

## Fuera de alcance
- Creación de tareas.
- Revisión y calificación docente.

## Criterios de aceptación
- CA-01: Dada una tarea asignada, cuando el estudiante la abra, entonces debe ver instrucciones y fecha límite.
- CA-02: El estudiante debe poder adjuntar archivo, escribir texto o usar ambos si la tarea lo permite.
- CA-03: Si la entrega ocurre después del límite, debe quedar marcada automáticamente como tardía.
- CA-04: Cada envío debe conservarse sin eliminar evidencia previa.
- CA-05: Tras enviar, el estudiante debe recibir confirmación visible del estado de su entrega.

## Definition of Done
- Flujo móvil de entrega disponible.
- Historial de submissions persistido.
- Regla de tardanza implementada.
- Soporte de archivos y texto verificado.
- Pruebas de envío puntual, tardío y reenvío completadas.

## Tareas técnicas
### Dominio
- Modelar estados de entrega y regla de tardanza.
### Aplicación / Casos de uso
- Implementar `submitClassroomTask`.
### Infraestructura
- Persistir `task_submissions` y adjuntos en Storage.
### Frontend / UI
- Crear pantalla de detalle y envío de tarea en menos de tres pasos principales.
### Seguridad / Permisos
- Validar que la tarea pertenece al estudiante por grupo/materia.
### Pruebas
- Cubrir puntualidad, tardanza, reenvío y acceso indebido.

## Prioridad sugerida
Media

Reason: Habilita el valor principal del Classroom para estudiantes.

## Dependencias
- HU-26.
- HU-16.

## Etiquetas sugeridas
- classroom
- submissions
- student-app

---

# HU-26 — Creación y asignación de tareas

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: No puede existir entrega estudiantil sin publicación previa de tareas por el profesor.
- Épica actual: Recursos educativos y Classroom.
- Épica sugerida: Recursos educativos y Classroom.
- Motivo de ubicación: Es el origen del flujo de Classroom.

## Historia refinada
Como profesor,
quiero crear tareas con instrucciones, fecha límite y grupo destino,
para asignar trabajo académico a mis estudiantes dentro de Edu360.

## Alcance funcional
- Título, instrucciones, fecha límite y archivos de apoyo.
- Selección de materia y grupo destino.
- Publicación a estudiantes autorizados.
- Notificación de nueva tarea.

## Fuera de alcance
- Revisión de entregas.
- Evaluaciones formales.

## Criterios de aceptación
- CA-01: El profesor debe poder crear tareas solo para materias que imparte.
- CA-02: Toda tarea debe contar con fecha límite antes de publicarse.
- CA-03: El grupo destino debe corresponder con sección o subgrupo válidos.
- CA-04: Al publicar, la tarea debe quedar visible para estudiantes asignados.
- CA-05: El sistema debe generar notificación de nueva tarea.

## Definition of Done
- Formulario de creación docente operativo.
- Validaciones de fecha y destino académico aplicadas.
- Publicación persistida en `classroom_tasks`.
- Notificación integrada.
- Pruebas de permisos y publicación completadas.

## Tareas técnicas
### Dominio
- Definir entidad de tarea y reglas obligatorias.
### Aplicación / Casos de uso
- Implementar `createClassroomTask`.
### Infraestructura
- Persistir tarea y archivos de apoyo.
### Frontend / UI
- Diseñar formulario web docente con selector de curso y fecha.
### Seguridad / Permisos
- Restringir creación a profesor dueño de la materia.
### Pruebas
- Cubrir creación válida, fecha ausente y materia ajena.

## Prioridad sugerida
Media

Reason: Es prerrequisito directo de HU-10.

## Dependencias
- HU-25.
- HU-23.

## Etiquetas sugeridas
- classroom
- teacher
- assignments

---

# HU-27 — Revisión de entregas, comentarios y puntuación

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por división y flujo faltante derivado de HU-10.

## Evaluación
- Decisión: Agregar.
- Motivo: La revisión docente forma parte del flujo completo definido en el SRS.
- Épica actual: Recursos educativos y Classroom.
- Épica sugerida: Recursos educativos y Classroom.
- Motivo de ubicación: Cierra el ciclo de la tarea publicada y entregada.

## Historia refinada
Como profesor,
quiero revisar entregas, dejar comentarios y registrar una puntuación cuando corresponda,
para dar seguimiento académico al trabajo de mis estudiantes.

## Alcance funcional
- Lista de entregas por tarea.
- Vista de evidencias.
- Comentarios de revisión.
- Puntuación opcional.
- Cambio de estado de revisión.

## Fuera de alcance
- Evaluaciones formales fuera del Classroom.
- Publicación de calificaciones globales.

## Criterios de aceptación
- CA-01: El profesor debe ver únicamente entregas asociadas a sus tareas.
- CA-02: Debe poder abrir archivos o texto entregado por el estudiante.
- CA-03: Debe poder agregar comentarios de revisión.
- CA-04: Si la tarea es calificable, debe poder registrar una puntuación válida.
- CA-05: La revisión debe dejar fecha, revisor y estado actualizado.

## Definition of Done
- Bandeja de revisión docente disponible.
- Evidencias accesibles bajo Storage policies.
- Comentarios y puntuación persistidos.
- Trazabilidad de revisión almacenada.
- Pruebas de acceso y revisión realizadas.

## Tareas técnicas
### Dominio
- Definir estados de revisión y relación con score.
### Aplicación / Casos de uso
- Implementar `reviewTaskSubmission`.
### Infraestructura
- Actualizar `task_submissions` con revisión y puntuación.
### Frontend / UI
- Crear vista de detalle con panel de evidencia y feedback.
### Seguridad / Permisos
- Restringir revisión al profesor creador o autorizado.
### Pruebas
- Cubrir revisión, puntuación opcional y acceso ajeno bloqueado.

## Prioridad sugerida
Media

Reason: Sin revisión, el Classroom queda reducido a recepción pasiva de archivos.

## Dependencias
- HU-10.
- HU-26.

## Etiquetas sugeridas
- classroom
- review
- teacher

---

# HU-28 — Consulta de recursos educativos publicados

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: Publicar recursos no genera valor si estudiantes y encargados autorizados no pueden consultarlos.
- Épica actual: Recursos educativos y Classroom.
- Épica sugerida: Recursos educativos y Classroom.
- Motivo de ubicación: Completa el flujo de recursos educativos.

## Historia refinada
Como estudiante o encargado legal autorizado,
quiero consultar recursos educativos disponibles para mis cursos o estudiantes vinculados,
para acceder al material académico permitido.

## Alcance funcional
- Listado de recursos por curso.
- Descarga o apertura según tipo.
- Filtros por materia o fecha.
- Visibilidad condicionada por configuración institucional.

## Fuera de alcance
- Edición de recursos.
- Retiro administrativo de contenido.

## Criterios de aceptación
- CA-01: El estudiante debe ver recursos de materias en las que está inscrito.
- CA-02: El encargado legal debe ver recursos del estudiante vinculado solo cuando la institución lo permita.
- CA-03: El usuario debe poder abrir o descargar el recurso según su tipo.
- CA-04: Los listados deben mostrar título, tipo, materia y fecha de publicación.
- CA-05: Usuarios sin vínculo o sin matrícula no deben visualizar recursos ajenos.

## Definition of Done
- Vistas de consulta disponibles para estudiante y encargado.
- Descarga segura habilitada.
- Configuración de visibilidad respetada.
- Estados vacíos, carga y error contemplados.
- Pruebas de acceso segmentado ejecutadas.

## Tareas técnicas
### Dominio
- Definir regla de visibilidad por rol y grupo.
### Aplicación / Casos de uso
- Implementar `listEducationalResources`.
### Infraestructura
- Generar URLs firmadas o acceso controlado a Storage.
### Frontend / UI
- Construir listas móviles con filtros simples.
### Seguridad / Permisos
- RLS y Storage policies alineadas con matrícula y vínculo.
### Pruebas
- Cubrir estudiante autorizado, encargado autorizado y acceso denegado.

## Prioridad sugerida
Media

Reason: Convierte la publicación en utilidad concreta para la comunidad educativa.

## Dependencias
- HU-09.
- HU-03.

## Etiquetas sugeridas
- resources
- students
- guardians

---

### Épica F — Administración, importaciones y configuración académica

# HU-11 — Importación de horarios desde aSc Horarios

## Fuente original
- Épica original: Administración e Importación de Datos.
- Historia original: HU-11: Importación de Horarios (aSc Horarios).

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva el objetivo y se precisa validación, previsualización y reporte de importación.
- Épica actual: Administración, importaciones y configuración académica.
- Épica sugerida: Administración, importaciones y configuración académica.
- Motivo de ubicación: Configura la estructura de clases necesaria para múltiples módulos.

## Historia refinada
Como administrador,
quiero importar horarios desde un archivo exportado por aSc Horarios,
para configurar de forma eficiente materias, profesores, secciones y bloques lectivos.

## Alcance funcional
- Carga del archivo de aSc.
- Lectura y mapeo de campos relevantes.
- Detección de duplicidades y cruces.
- Previsualización previa a persistir.
- Reporte de éxitos, advertencias y errores.

## Fuera de alcance
- Edición manual exhaustiva del horario importado.
- Definición final del formato exacto de aSc sin anexo técnico.

## Criterios de aceptación
- CA-01: El administrador debe poder cargar un archivo válido de exportación de aSc.
- CA-02: El sistema debe mostrar una previsualización antes de confirmar la importación.
- CA-03: Debe detectar conflictos de profesor, horario o duplicidad.
- CA-04: Al confirmar, los datos válidos deben persistirse en PostgreSQL.
- CA-05: Al finalizar, se debe generar un reporte con resultados y errores identificados.

## Definition of Done
- Flujo de importación implementado hasta el punto permitido por la especificación disponible.
- Validador y previsualización construidos.
- Persistencia transaccional lista.
- Reporte descargable o visible generado.
- Pruebas con archivos válidos, inválidos y conflictivos ejecutadas.

## Tareas técnicas
### Dominio
- Definir modelo de mapping entre aSc y entidades Edu360.
### Aplicación / Casos de uso
- Implementar `previewScheduleImport` y `confirmScheduleImport`.
### Infraestructura
- Crear parser server-side o Edge Function para el archivo.
### Frontend / UI
- Construir wizard de carga, revisión y confirmación.
### Seguridad / Permisos
- Restringir importación a admin o super admin.
### Pruebas
- Cubrir cruces, duplicados, previsualización y persistencia.

## Prioridad sugerida
Alta

Reason: Alimenta horarios, asistencia, ausencias anticipadas y asignaciones docentes.

## Dependencias
- HU-25.

## Etiquetas sugeridas
- import
- schedules
- admin

---

# HU-12 — Importación de estudiantes desde CSV

## Fuente original
- Épica original: Administración e Importación de Datos.
- Historia original: HU-12: Importación de Estudiantes (CSV).

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva el flujo y se explicita el esquema mínimo, validaciones y reporte final.
- Épica actual: Administración, importaciones y configuración académica.
- Épica sugerida: Administración, importaciones y configuración académica.
- Motivo de ubicación: Habilita el padrón académico sobre el que opera el sistema.

## Historia refinada
Como administrador,
quiero importar el padrón de estudiantes mediante CSV,
para crear o actualizar cuentas académicas de forma controlada.

## Alcance funcional
- Validación del esquema definido.
- Verificación de correo `@est.mep.go.cr`.
- Validación de identificación.
- Asignación a sección y subgrupo.
- Reporte de éxito y errores.

## Fuera de alcance
- Inscripción financiera o matrícula externa.
- Edición individual posterior desde esta historia.

## Criterios de aceptación
- CA-01: El sistema debe aceptar un CSV con los campos obligatorios definidos en el SRS.
- CA-02: Debe rechazar correos que no correspondan al dominio estudiantil requerido.
- CA-03: Debe validar identificación y relaciones con sección/subgrupo.
- CA-04: Al finalizar, debe mostrar conteo de registros exitosos, omitidos y fallidos.
- CA-05: Los errores deben quedar asociados a fila o causa para facilitar corrección.

## Definition of Done
- Proceso migrado a flujo server-side o Edge Function.
- Esquema de CSV validado.
- Reporte final disponible.
- Integridad referencial aplicada.
- Pruebas con 500 registros y casos inválidos ejecutadas.

## Tareas técnicas
### Dominio
- Definir reglas de importación y deduplicación de estudiantes.
### Aplicación / Casos de uso
- Implementar `importStudentsCsv`.
### Infraestructura
- Procesar CSV y persistir con transacciones.
### Frontend / UI
- Crear carga y resumen de resultados.
### Seguridad / Permisos
- Restringir importación a admin/super admin y auditarla.
### Pruebas
- Cubrir correos inválidos, secciones inexistentes y performance objetivo.

## Prioridad sugerida
Alta

Reason: Es indispensable para poblar la plataforma de forma escalable.

## Dependencias
- HU-25.

## Etiquetas sugeridas
- import
- students
- supabase-edge

---

# HU-24 — Gestión de usuarios y generación de códigos

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige administración de cuentas y generación de códigos de registro/vinculación.
- Épica actual: Administración, importaciones y configuración académica.
- Épica sugerida: Administración, importaciones y configuración académica.
- Motivo de ubicación: Es una capacidad administrativa base para onboarding y gobierno de usuarios.

## Historia refinada
Como administrador,
quiero gestionar cuentas de profesores y encargados, y generar códigos de registro o vinculación,
para controlar quién accede al sistema y cómo se conecta con el centro.

## Alcance funcional
- Crear, editar y desactivar usuarios habilitados por centro.
- Generar códigos de activación.
- Generar códigos de vinculación de estudiantes.
- Consultar estado básico de cada código.

## Fuera de alcance
- Gestión global de centros por super admin.
- Soporte de tickets o incidencias.

## Criterios de aceptación
- CA-01: El administrador debe crear, editar y desactivar profesores o encargados de su centro.
- CA-02: Debe poder generar códigos de registro ligados a rol y centro.
- CA-03: Debe poder generar códigos de vinculación para estudiantes autorizados.
- CA-04: Los códigos deben mostrar estado vigente, usado o expirado.
- CA-05: El administrador no debe administrar usuarios de otro centro.

## Definition of Done
- Pantallas administrativas operativas.
- Generación de códigos reutilizada por HU-01 y HU-03.
- Desactivación de usuario disponible.
- Auditoría de acciones críticas guardada.
- Pruebas de scope por centro ejecutadas.

## Tareas técnicas
### Dominio
- Definir entidades administrativas y ciclo de vida de códigos.
### Aplicación / Casos de uso
- Implementar `manageCenterUsers` y `generateActivationCodes`.
### Infraestructura
- Persistir usuarios, roles, códigos y auditoría.
### Frontend / UI
- Crear tablas administrativas con modales/formularios.
### Seguridad / Permisos
- RLS y controles server-side para admin del centro.
### Pruebas
- Cubrir alta, edición, desactivación y generación de códigos.

## Prioridad sugerida
Alta

Reason: Es prerrequisito de registro controlado y vinculación familiar.

## Dependencias
- HU-16.

## Etiquetas sugeridas
- admin
- user-management
- codes

---

# HU-25 — Gestión de secciones, materias, horarios y calendario escolar

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: Estos catálogos gobiernan asistencia, ausencias, recursos, tareas, evaluaciones e importaciones.
- Épica actual: Administración, importaciones y configuración académica.
- Épica sugerida: Administración, importaciones y configuración académica.
- Motivo de ubicación: Es configuración estructural del centro educativo.

## Historia refinada
Como administrador,
quiero configurar secciones, subgrupos, materias y calendario escolar,
para sostener correctamente la operación académica del centro.

## Alcance funcional
- Gestión de secciones y subgrupos.
- Gestión de materias y asignaciones.
- Configuración de calendario, feriados y períodos.
- Relación básica con profesores y horarios.

## Fuera de alcance
- Planeamiento curricular completo.
- Cálculo automático de notas finales.

## Criterios de aceptación
- CA-01: El administrador debe crear y editar secciones con formato válido.
- CA-02: Debe registrar subgrupos opcionales asociados a secciones.
- CA-03: Debe configurar materias y relacionarlas con secciones/subgrupos.
- CA-04: Debe administrar feriados y períodos usados por reglas de asistencia y justificaciones.
- CA-05: Los datos configurados deben quedar aislados por centro educativo.

## Definition of Done
- CRUD administrativo disponible para catálogos esenciales.
- Reglas de formato y relaciones validadas.
- Calendario consumible por otros casos de uso.
- Aislamiento multi-tenant verificado.
- Pruebas de estructura académica ejecutadas.

## Tareas técnicas
### Dominio
- Modelar `sections`, `subgroups`, `subjects`, `academic_periods`.
### Aplicación / Casos de uso
- Implementar casos de uso CRUD y asignación docente básica.
### Infraestructura
- Crear índices y constraints relacionales.
### Frontend / UI
- Diseñar pantallas administrativas densas y filtrables.
### Seguridad / Permisos
- Autorizar solo admin/super admin según scope.
### Pruebas
- Cubrir relaciones válidas, duplicidad y feriados.

## Prioridad sugerida
Alta

Reason: Muchos módulos posteriores dependen de esta configuración maestra.

## Dependencias
- HU-16.

## Etiquetas sugeridas
- admin
- academic-setup
- catalog

---

### Épica G — Notificaciones, alertas, reportes y analítica

# HU-13 — Alertas de ausentismo crítico

## Fuente original
- Épica original: Reportes y Alertas.
- Historia original: HU-13: Alertas de Ausentismo Crítico.

## Evaluación
- Decisión: Mover y reescribir.
- Motivo: La historia mezcla configuración de umbral y notificación operativa, pero pertenece con mayor precisión a Notificaciones y Alertas.
- Épica actual: Notificaciones, alertas, reportes y analítica.
- Épica sugerida: Notificaciones y alertas.
- Motivo de ubicación: Su valor principal es disparar y gobernar alertas automáticas.

## Historia refinada
Como administrador,
quiero configurar un umbral mínimo de asistencia y activar alertas automáticas,
para identificar tempranamente casos de ausentismo crítico.

## Alcance funcional
- Configuración del porcentaje de umbral.
- Valor por defecto del 80 %.
- Detección de estudiantes bajo umbral.
- Notificación a encargado legal y administrador.

## Fuera de alcance
- Intervenciones socioeducativas posteriores.
- Reportes exportables.

## Criterios de aceptación
- CA-01: El administrador debe poder consultar y modificar el umbral de asistencia de su centro.
- CA-02: El valor inicial debe ser 80 % si no existe configuración previa.
- CA-03: Cuando un estudiante quede por debajo del umbral en una materia, el sistema debe generar alerta.
- CA-04: La alerta debe enviarse al administrador y al encargado legal autorizado.
- CA-05: Las alertas deben calcularse con datos de asistencia vigentes y no duplicarse sin cambio relevante.

## Definition of Done
- Configuración de umbral disponible.
- Cálculo de porcentaje definido y probado.
- Notificaciones integradas.
- Deduplicación básica de alertas contemplada.
- Pruebas con datos por debajo y por encima del umbral ejecutadas.

## Tareas técnicas
### Dominio
- Definir fórmula de porcentaje y condición de disparo.
### Aplicación / Casos de uso
- Implementar `configureAttendanceThreshold` y `evaluateAbsenteeismAlerts`.
### Infraestructura
- Persistir configuración por centro y programar evaluación.
### Frontend / UI
- Crear control administrativo y estados de alerta.
### Seguridad / Permisos
- Restringir configuración a admin/super admin.
### Pruebas
- Cubrir valor por defecto, cambio de umbral y alerta generada.

## Prioridad sugerida
Alta

Reason: Es una capacidad preventiva y requisito explícito del producto.

## Dependencias
- HU-06.
- HU-23.

## Etiquetas sugeridas
- alerts
- absenteeism
- admin

---

# HU-14 — Exportación de reportes PDF y Excel

## Fuente original
- Épica original: Reportes y Alertas.
- Historia original: HU-14: Exportación de Reportes PDF/Excel.

## Evaluación
- Decisión: Reescribir.
- Motivo: Se conserva el objetivo y se concreta el alcance de reportes exportables.
- Épica actual: Notificaciones, alertas, reportes y analítica.
- Épica sugerida: Reportes y analítica.
- Motivo de ubicación: Atiende necesidades de entrega formal y procesamiento administrativo.

## Historia refinada
Como docente o administrador,
quiero exportar reportes de asistencia y resultados en PDF y Excel,
para cumplir requerimientos administrativos y analizar datos fuera de Edu360.

## Alcance funcional
- Reporte por estudiante.
- Reporte por grupo o sección.
- Reporte por materia.
- Exportación PDF y `.xlsx`.
- Inclusión de porcentaje de asistencia y señalización de umbral.

## Fuera de alcance
- Dashboards interactivos.
- Reportes externos personalizados no definidos en SRS.

## Criterios de aceptación
- CA-01: El usuario autorizado debe seleccionar tipo de reporte y rango de fechas cuando aplique.
- CA-02: El sistema debe generar exportación PDF para lectura/presentación.
- CA-03: El sistema debe generar exportación Excel para procesamiento de datos.
- CA-04: Los reportes deben incluir porcentaje de asistencia y destacar umbral crítico cuando corresponda.
- CA-05: Los datos exportados deben respetar los permisos del usuario solicitante.

## Definition of Done
- Generación de reportes disponible para admin y profesor según scope.
- Plantillas de PDF y Excel consistentes.
- Rendimiento alineado al objetivo del SRS.
- Datos filtrados por permisos.
- Pruebas de contenido y autorización ejecutadas.

## Tareas técnicas
### Dominio
- Definir modelos de consulta de reportes.
### Aplicación / Casos de uso
- Implementar generación por estudiante, grupo y materia.
### Infraestructura
- Crear queries eficientes y motor de exportación.
### Frontend / UI
- Construir selector de reporte y feedback de progreso.
### Seguridad / Permisos
- Filtrar datasets según rol, centro y asignaciones.
### Pruebas
- Cubrir PDF, Excel, filtros y alcance de datos.

## Prioridad sugerida
Alta

Reason: Cumple una necesidad administrativa explícita y aparece como objetivo del roadmap.

## Dependencias
- HU-06.
- HU-13.

## Etiquetas sugeridas
- reports
- pdf
- excel

---

# HU-23 — Centro de notificaciones en app

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige visualización in-app de notificaciones para todos los roles.
- Épica actual: Notificaciones, alertas, reportes y analítica.
- Épica sugerida: Notificaciones y alertas.
- Motivo de ubicación: Centraliza los eventos disparados por múltiples módulos.

## Historia refinada
Como usuario de Edu360,
quiero consultar mis notificaciones dentro de la aplicación,
para revisar eventos importantes aunque no haya visto el push o correo original.

## Alcance funcional
- Listado de notificaciones relevantes para el usuario.
- Estado leído/no leído.
- Apertura del detalle o destino funcional.
- Soporte para eventos de asistencia, ausencias, tareas, evaluaciones y alertas.

## Fuera de alcance
- Preferencias avanzadas de suscripción por tipo.
- Mensajería bidireccional.

## Criterios de aceptación
- CA-01: El usuario debe ver únicamente notificaciones dirigidas a su perfil.
- CA-02: Las notificaciones deben mostrar tipo, mensaje y fecha.
- CA-03: El usuario debe poder marcar una notificación como leída.
- CA-04: Cuando exista destino funcional, la notificación debe llevar al contexto relacionado.
- CA-05: Los eventos críticos deben quedar disponibles aunque el push externo falle.

## Definition of Done
- Centro de notificaciones disponible en app y/o web según rol.
- Persistencia de `notifications` operativa.
- Marcar leído funcionando.
- Navegación contextual contemplada.
- Pruebas de visibilidad y fallback realizadas.

## Tareas técnicas
### Dominio
- Definir tipos de notificación y estado de lectura.
### Aplicación / Casos de uso
- Implementar `listNotifications` y `markNotificationRead`.
### Infraestructura
- Persistir notificaciones y relacionarlas con eventos de negocio.
### Frontend / UI
- Crear bandeja compacta con badges y detalle.
### Seguridad / Permisos
- RLS por destinatario.
### Pruebas
- Cubrir recepción, lectura y acceso aislado.

## Prioridad sugerida
Alta

Reason: Es la capa visible de comunicación del sistema y habilita múltiples historias.

## Dependencias
- HU-16.

## Etiquetas sugeridas
- notifications
- realtime
- inbox

---

# HU-29 — Dashboard administrativo de asistencia y operación

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige estadísticas globales, estudiantes críticos y clases sin registro.
- Épica actual: Notificaciones, alertas, reportes y analítica.
- Épica sugerida: Reportes y analítica.
- Motivo de ubicación: Es la vista ejecutiva del centro educativo.

## Historia refinada
Como administrador,
quiero visualizar indicadores generales de asistencia y operación,
para detectar rápidamente riesgos y pendientes del centro educativo.

## Alcance funcional
- Tasa global de asistencia.
- Clases sin registro.
- Estudiantes críticos por umbral.
- Indicadores básicos en tiempo razonable.

## Fuera de alcance
- BI avanzado.
- Predicciones o analítica estadística sofisticada.

## Criterios de aceptación
- CA-01: El dashboard debe mostrar la tasa general de asistencia del centro.
- CA-02: Debe listar clases sin registro cuando existan.
- CA-03: Debe resaltar estudiantes bajo umbral configurado.
- CA-04: Los datos deben corresponder solo al centro del administrador.
- CA-05: La pantalla debe manejar estados de carga, error y ausencia de datos.

## Definition of Done
- Dashboard administrativo implementado.
- Consultas optimizadas y paginadas cuando aplique.
- Indicadores consistentes con reportes exportables.
- Scope multi-tenant validado.
- Pruebas de datos y performance base completadas.

## Tareas técnicas
### Dominio
- Definir agregados de asistencia requeridos.
### Aplicación / Casos de uso
- Implementar `getAdminAttendanceDashboard`.
### Infraestructura
- Crear vistas o queries agregadas en PostgreSQL.
### Frontend / UI
- Diseñar panel administrativo sobrio y escaneable.
### Seguridad / Permisos
- Restringir a admin/super admin por centro.
### Pruebas
- Cubrir métricas correctas y ausencia de fugas entre centros.

## Prioridad sugerida
Media

Reason: Aporta visibilidad gerencial una vez disponibles los datos operativos.

## Dependencias
- HU-06.
- HU-13.
- HU-20.

## Etiquetas sugeridas
- analytics
- admin-dashboard
- attendance

---

### Épica H — Evaluaciones y resultados académicos

# HU-30 — Registro de evaluaciones académicas

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS define un módulo explícito de evaluaciones no cubierto por las historias originales.
- Épica actual: Evaluaciones y resultados académicos.
- Épica sugerida: Evaluaciones y resultados académicos.
- Motivo de ubicación: Es la base del módulo de resultados.

## Historia refinada
Como profesor,
quiero registrar evaluaciones asociadas a una materia, grupo y fecha,
para documentar instrumentos académicos aplicados en Edu360.

## Alcance funcional
- Título y tipo de evaluación.
- Materia, grupo y fecha.
- Puntaje máximo.
- Estado de evaluación.

## Fuera de alcance
- Ingreso de puntuaciones individuales.
- Cálculo final de promedios.

## Criterios de aceptación
- CA-01: El profesor debe crear evaluaciones solo para materias que imparte.
- CA-02: La evaluación debe guardar fecha, tipo y puntaje máximo.
- CA-03: El sistema no debe permitir puntuaciones si falta la definición base de la evaluación.
- CA-04: La evaluación debe quedar asociada a centro, materia y grupo correctos.
- CA-05: La pantalla debe diferenciar visualmente evaluaciones pendientes, aplicadas, calificadas y vencidas.

## Definition of Done
- Formulario de creación docente disponible.
- Validaciones de datos obligatorios aplicadas.
- Tabla `evaluations` operativa.
- Estados visuales contemplados.
- Pruebas de creación válida e inválida completadas.

## Tareas técnicas
### Dominio
- Definir entidad evaluación y estados.
### Aplicación / Casos de uso
- Implementar `createEvaluation`.
### Infraestructura
- Persistir evaluación en PostgreSQL con constraints.
### Frontend / UI
- Crear gestor de evaluaciones docente.
### Seguridad / Permisos
- Limitar creación a profesor asignado.
### Pruebas
- Cubrir campos obligatorios, estados y permisos.

## Prioridad sugerida
Media

Reason: Abre el módulo académico complementario definido por el SRS.

## Dependencias
- HU-25.

## Etiquetas sugeridas
- evaluations
- teacher
- academics

---

# HU-31 — Registro y modificación auditada de puntuaciones

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige puntuación manual con validación de máximo y trazabilidad.
- Épica actual: Evaluaciones y resultados académicos.
- Épica sugerida: Evaluaciones y resultados académicos.
- Motivo de ubicación: Complementa la creación de evaluaciones.

## Historia refinada
Como profesor autorizado,
quiero ingresar o corregir puntuaciones manuales de evaluaciones,
para registrar resultados académicos con control y trazabilidad.

## Alcance funcional
- Carga individual o múltiple de puntuaciones.
- Validación contra puntaje máximo.
- Comentario opcional.
- Registro de usuario, fecha y cambios.

## Fuera de alcance
- Calificación automática.
- Publicación final al estudiante.

## Criterios de aceptación
- CA-01: El profesor debe poder ingresar puntuaciones solo en evaluaciones de sus materias.
- CA-02: El sistema debe rechazar una puntuación superior al máximo configurado.
- CA-03: Toda modificación debe guardar valor anterior, valor nuevo, usuario y fecha.
- CA-04: Debe poder registrarse un comentario opcional asociado a la puntuación.
- CA-05: La edición debe respetar el aislamiento por centro educativo.

## Definition of Done
- Registro y edición de puntuaciones disponibles.
- Validación de rango implementada.
- Auditoría de cambios persistida.
- UI apta para carga repetitiva.
- Pruebas de rango, auditoría y permisos completadas.

## Tareas técnicas
### Dominio
- Definir reglas de score y auditoría.
### Aplicación / Casos de uso
- Implementar `recordEvaluationScores`.
### Infraestructura
- Persistir en `evaluation_scores` y `audit_logs`.
### Frontend / UI
- Crear grilla de captura eficiente para docentes.
### Seguridad / Permisos
- RLS y validación server-side por materia y centro.
### Pruebas
- Cubrir score válido, excedido y actualización auditada.

## Prioridad sugerida
Media

Reason: Sin puntuaciones, el módulo de evaluaciones queda incompleto.

## Dependencias
- HU-30.

## Etiquetas sugeridas
- evaluations
- grading
- audit

---

# HU-32 — Consulta de resultados publicados

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige visibilidad de resultados para estudiantes, encargados y lectura administrativa.
- Épica actual: Evaluaciones y resultados académicos.
- Épica sugerida: Evaluaciones y resultados académicos.
- Motivo de ubicación: Convierte los resultados cargados en información útil para los usuarios.

## Historia refinada
Como estudiante, encargado legal o administrador autorizado,
quiero consultar resultados de evaluaciones publicados,
para dar seguimiento al desempeño académico correspondiente.

## Alcance funcional
- Resultados propios para estudiante.
- Resultados de estudiantes vinculados para encargado.
- Consulta de solo lectura para administrador.
- Filtros por materia, período y evaluación.

## Fuera de alcance
- Reclamaciones o revisiones formales.
- Cálculo de promedios finales.

## Criterios de aceptación
- CA-01: El estudiante debe consultar únicamente resultados propios publicados.
- CA-02: El encargado debe consultar únicamente resultados de estudiantes vinculados.
- CA-03: El administrador debe ver resultados del centro en modo lectura.
- CA-04: Los resultados deben mostrar evaluación, materia, puntaje y fecha de publicación.
- CA-05: Un resultado no publicado no debe exponerse a estudiante ni encargado.

## Definition of Done
- Vistas de consulta diferenciadas por rol.
- Filtros básicos implementados.
- Regla de publicación aplicada.
- Aislamiento multi-tenant verificado.
- Pruebas de visibilidad y ocultamiento completadas.

## Tareas técnicas
### Dominio
- Definir estado publicable de resultado.
### Aplicación / Casos de uso
- Implementar `listPublishedEvaluationResults`.
### Infraestructura
- Consultar `evaluations` y `evaluation_scores` con filtros.
### Frontend / UI
- Crear listados móviles y web claros.
### Seguridad / Permisos
- Restringir por rol, vínculo y estado publicado.
### Pruebas
- Cubrir estudiante, encargado, admin y resultado no publicado.

## Prioridad sugerida
Media

Reason: Es el cierre visible del módulo de evaluaciones.

## Dependencias
- HU-30.
- HU-31.
- HU-23.

## Etiquetas sugeridas
- evaluations
- results
- guardians

---

### Épica I — Reportes complementarios de tareas y seguimiento familiar

# HU-33 — Consulta de tareas, entregas y asistencia resumida para seguimiento

## Fuente original
- Épica original: No aplica.
- Historia original: Fuente: Historia agregada por flujo faltante.

## Evaluación
- Decisión: Agregar.
- Motivo: El SRS exige reportes de tareas entregadas, pendientes y tardías, y resumen de asistencia para encargados.
- Épica actual: Reportes complementarios de tareas y seguimiento familiar.
- Épica sugerida: Reportes y analítica.
- Motivo de ubicación: Complementa exportaciones y resultados con vistas de seguimiento cotidiano.

## Historia refinada
Como profesor, administrador o encargado legal autorizado,
quiero consultar resúmenes de asistencia y estado de tareas relevantes,
para monitorear cumplimiento académico sin depender de exportaciones.

## Alcance funcional
- Resumen de asistencia del estudiante por materia y período para encargado.
- Consulta de tareas entregadas, pendientes y tardías para profesor/admin.
- Lectura por estudiante, grupo o materia según rol.
- Señales visuales de riesgo o atraso.

## Fuera de alcance
- Exportación de estas vistas en esta historia.
- Predicciones de rendimiento.

## Criterios de aceptación
- CA-01: El encargado debe consultar resumen de asistencia de su estudiante vinculado por materia y período.
- CA-02: El profesor debe consultar tareas entregadas, pendientes y tardías dentro de sus materias.
- CA-03: El administrador debe consultar resúmenes del centro en modo autorizado.
- CA-04: Los listados deben poder filtrarse por estudiante, grupo o materia cuando corresponda.
- CA-05: Los datos mostrados deben respetar permisos y no mezclar centros educativos.

## Definition of Done
- Vistas de seguimiento disponibles por rol.
- Consultas agregadas correctas.
- Filtros esenciales operativos.
- Estados de riesgo visibles.
- Pruebas de alcance de datos y consistencia completadas.

## Tareas técnicas
### Dominio
- Definir agregados de asistencia y tareas.
### Aplicación / Casos de uso
- Implementar consultas de seguimiento familiar y académico.
### Infraestructura
- Optimizar agregaciones y paginación.
### Frontend / UI
- Diseñar paneles compactos, escaneables y responsive.
### Seguridad / Permisos
- Filtrar por rol, centro, asignaciones y vínculos.
### Pruebas
- Cubrir resúmenes correctos y bloqueos de visibilidad.

## Prioridad sugerida
Media

Reason: Aporta valor continuo a seguimiento familiar y coordinación académica.

## Dependencias
- HU-06.
- HU-10.
- HU-26.

## Etiquetas sugeridas
- analytics
- classroom
- guardian-insights

---

## 5. Historias eliminadas

- Ninguna. Las 14 historias originales fueron consideradas y preservadas mediante reescritura, división controlada o expansión complementaria.

## 6. Ítems convertidos en tareas técnicas

- Validación JWT de Supabase en endpoints server-side y Edge Functions, asignada principalmente a HU-16.
- Diseño e implementación de políticas RLS para tablas expuestas, distribuida entre HU-03, HU-06, HU-18, HU-22, HU-24, HU-28, HU-31 y HU-32.
- Storage policies para adjuntos de justificaciones, recursos educativos y entregas, asignadas a HU-07, HU-09, HU-10, HU-27 y HU-28.
- Auditoría de cambios críticos en asistencia, importaciones, entregas, evaluaciones y puntuaciones, asignada a HU-19, HU-24, HU-31 y módulos equivalentes.
- Generación de tipos TypeScript desde Supabase/PostgreSQL, aplicada transversalmente a módulos de persistencia.
- Separación de entornos dev/staging/prod, pipeline CI/CD, paginación eficiente e índices, mantenidos como trabajo técnico transversal de calidad y no como historias funcionales.

## 7. Historias agregadas por flujo faltante

| ID | Historia | Motivo |
|---|---|---|
| HU-15 | Recuperación y restablecimiento de contraseña | Requisito funcional explícito de autenticación. |
| HU-16 | Sesión segura, cierre de sesión y acceso protegido | Requisito de seguridad y navegación protegida. |
| HU-17 | Registro de salida y estado "Fuera de sede" | Completa el flujo institucional de presencia. |
| HU-18 | Historial de ingresos y listado de estudiantes activos | Requisito de consulta operativa y familiar. |
| HU-19 | Modificación controlada de asistencia del mismo día | Regla del SRS con trazabilidad propia. |
| HU-20 | Alerta por asistencia no registrada en 15 minutos | Regla operativa diferenciada. |
| HU-21 | Solicitud de ausencia anticipada | Flujo separado de justificación posterior. |
| HU-22 | Historial de solicitudes y consulta administrativa | Requisito de seguimiento de trámites. |
| HU-23 | Centro de notificaciones en app | Requisito transversal para todos los roles. |
| HU-24 | Gestión de usuarios y generación de códigos | Prerrequisito para onboarding y vinculación. |
| HU-25 | Gestión de secciones, materias, horarios y calendario escolar | Configuración maestra de múltiples módulos. |
| HU-26 | Creación y asignación de tareas | Prerrequisito de las entregas estudiantiles. |
| HU-27 | Revisión de entregas, comentarios y puntuación | Cierra el ciclo del Classroom. |
| HU-28 | Consulta de recursos educativos publicados | Completa el valor de HU-09 para usuarios finales. |
| HU-29 | Dashboard administrativo de asistencia y operación | Requisito de estadísticas globales. |
| HU-30 | Registro de evaluaciones académicas | Nuevo módulo funcional del SRS. |
| HU-31 | Registro y modificación auditada de puntuaciones | Requisito explícito de evaluaciones. |
| HU-32 | Consulta de resultados publicados | Visibilidad requerida para estudiantes, encargados y administración. |
| HU-33 | Consulta de tareas, entregas y asistencia resumida para seguimiento | Requisito de reportes complementarios y seguimiento familiar. |
| HU-34 | Inicio de sesión con Google OAuth en web y móvil | Criterio explícito de la HU-02 original y requisito del SRS. |

## 8. Historias movidas de épica

| Historia | Épica original | Épica sugerida | Motivo |
|---|---|---|---|
| HU-13 | Reportes y Alertas | Notificaciones y alertas | Su valor principal es configurar y disparar alertas automáticas, no generar reportes. |

## 9. Orden recomendado de implementación

### Fase 1 — Base del sistema
- HU-01
- HU-02
- HU-34
- HU-15
- HU-16
- HU-24
- HU-25

### Fase 2 — Flujo principal
- HU-03
- HU-04
- HU-05
- HU-17
- HU-06
- HU-19
- HU-20
- HU-07
- HU-08
- HU-21
- HU-22
- HU-23

### Fase 3 — Funcionalidades avanzadas
- HU-11
- HU-12
- HU-13
- HU-14
- HU-18
- HU-09
- HU-28
- HU-26
- HU-10
- HU-27

### Fase 4 — Métricas, auditoría y mejoras
- HU-29
- HU-30
- HU-31
- HU-32
- HU-33
