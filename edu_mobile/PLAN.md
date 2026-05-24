# Edu360 Mobile - Plan diferido

## Estado vigente
La app movil queda diferida hasta la fase final del proyecto. La tecnologia
objetivo cambiara, por lo que este plan ya no debe ejecutarse como roadmap
activo sobre React Native/Expo.

El contenido siguiente se conserva solo como referencia historica de flujos,
pantallas y necesidades funcionales que deberan reinterpretarse cuando se defina
la nueva tecnologia movil.

## Resumen
La app movil ya no debe planificarse como una aplicacion solo para profesores ni
como un desarrollo nuevo desde cero. El codigo actual ya incluye flujos de
profesores y encargados legales sobre Firebase. Este plan conserva ese trabajo y
lo reordena para adaptarlo al backlog refinado, especialmente a la migracion de
backend hacia Supabase/PostgreSQL.

## Historias del backlog que afectan directamente mobile
- HU-02 — Inicio de sesion con dominios institucionales.
- HU-03 — Vinculacion de estudiantes a encargados legales.
- HU-06 — Toma de asistencia por clase.
- HU-07 — Justificacion de ausencia posterior.
- HU-15 — Recuperacion y restablecimiento de contrasena.
- HU-16 — Sesion segura, cierre de sesion y acceso protegido.
- HU-19 — Modificacion controlada de asistencia del mismo dia.
- HU-20 — Alerta por asistencia no registrada en 15 minutos.
- HU-21 — Solicitud de ausencia anticipada.
- HU-22 — Historial de solicitudes.
- HU-23 — Centro de notificaciones.
- HU-34 — Google OAuth en web y movil.

## Base implementada que se debe reutilizar
- Navegacion Expo Router ya separada entre profesor y encargado.
- Login, registro, captura de correo MEP y agregacion de rol/hijo.
- Dashboard, horario, asistencia, perfil y comunicados para profesor.
- Home, asistencia, perfil, comunicados y justificaciones para encargado.
- `AuthContext`, `TeacherContext` y `ParentContext`.
- Servicios actuales de autenticacion, asistencia, ausencias, comunicados y
  justificaciones.

El criterio rector es simple: si el flujo ya existe y el backlog mantiene su
experiencia, se migra y fortalece; no se vuelve a disenar de cero.

## Cambio arquitectonico obligatorio
- Reemplazar Firebase Auth por Supabase Auth.
- Reemplazar Firestore por PostgreSQL/Supabase.
- Reemplazar Firebase Storage por Supabase Storage cuando haya adjuntos.
- Resolver permisos con JWT, roles, `center_id` y RLS.
- Integrar FCM solo como canal push complementario, sin asumir que sustituye el
  centro de notificaciones del producto.

## Checklist actualizado

### Fase 1 — Fundacion tecnica de Supabase en mobile
- [ ] 1.1 Incorporar cliente Supabase para Expo y estrategia segura de sesion.
- [ ] 1.2 Definir repositorios/adaptadores para no mezclar UI con consultas
      directas.
- [ ] 1.3 Generar o incorporar tipos TypeScript derivados del esquema Supabase.
- [ ] 1.4 Migrar configuracion de entornos y variables requeridas por la app.
- [ ] 1.5 Mantener el theming, navegacion y layouts ya construidos.

### Fase 2 — Autenticacion y sesion segura
- [ ] 2.1 Migrar `services/auth.ts` de Firebase a Supabase Auth.
- [ ] 2.2 Adaptar login email/password conforme a HU-02.
- [ ] 2.3 Implementar recuperacion/restablecimiento de contrasena de HU-15.
- [ ] 2.4 Adaptar `AuthContext` para sesion persistente, expiracion y logout de
      HU-16.
- [ ] 2.5 Proteger rutas por rol y estado activo, conservando la navegacion ya
      existente.
- [ ] 2.6 Preparar Google OAuth movil de HU-34 con callbacks compatibles con Expo.

### Fase 3 — Profesor: horario y asistencia
- [ ] 3.1 Migrar consultas de horario del profesor a Supabase.
- [ ] 3.2 Migrar carga de grupos y estudiantes usados en asistencia.
- [ ] 3.3 Migrar guardado de asistencia por clase a tablas PostgreSQL.
- [ ] 3.4 Implementar historial y correccion del mismo dia segun HU-19.
- [ ] 3.5 Preparar disparadores de alerta de HU-20 sin duplicar logica en cliente.
- [ ] 3.6 Revalidar que el profesor solo opere clases asignadas.

### Fase 4 — Encargados legales
- [ ] 4.1 Migrar registro con codigo y flujo `add-child` a Supabase.
- [ ] 4.2 Migrar `ParentContext` y consultas familiares a `guardian_students`.
- [ ] 4.3 Mantener las vistas ya implementadas de resumen, asistencia y perfil.
- [ ] 4.4 Migrar justificaciones y adjuntos a Supabase Storage.
- [ ] 4.5 Adaptar historial y futuras solicitudes anticipadas a HU-21 y HU-22.
- [ ] 4.6 Verificar consentimiento y bloqueo de acceso cruzado conforme a HU-03.

### Fase 5 — Comunicados, notificaciones y experiencia transversal
- [ ] 5.1 Mantener la experiencia de comunicados ya presente y migrar su fuente de
      datos.
- [ ] 5.2 Preparar centro de notificaciones en app conforme a HU-23.
- [ ] 5.3 Integrar FCM solo donde el backlog pide alerta externa o recordatorio.
- [ ] 5.4 Homologar estados de carga, vacio, error, no encontrado y acceso denegado.

### Fase 6 — Pruebas y regresion de migracion
- [ ] 6.1 Probar login, logout y persistencia de sesion.
- [ ] 6.2 Probar asistencia profesor de punta a punta.
- [ ] 6.3 Probar vinculacion de encargado y lectura restringida de hijos.
- [ ] 6.4 Probar justificaciones con y sin adjuntos.
- [ ] 6.5 Validar manualmente navegacion de ambas areas en Android/iOS o en Expo.
- [ ] 6.6 Retirar dependencias Firebase solo cuando los reemplazos Supabase esten
      cubiertos por pruebas y QA.

## Pendientes que cambian de significado
- El antiguo "login Google nativo" sigue pendiente, pero ahora debe resolverse
  como HU-34 sobre Supabase Auth.
- El antiguo "historial de asistencias previas" se convierte en parte de HU-19
  y debe contemplar reglas de edicion controlada.
- Las notificaciones push ya no son una mejora aislada: se conectan con HU-20 y
  HU-23.
- El vinculo explicito de profesor deja de ser una mejora de Firestore y pasa a
  resolverse mediante relaciones y RLS del nuevo modelo SQL.

## Stack tecnologico objetivo
- Expo SDK 54 + Expo Router 6.
- React Native 0.81.
- TypeScript.
- Supabase Auth.
- Supabase/PostgreSQL.
- Supabase Storage para adjuntos.
- FCM como canal push complementario.

## Diseno que se conserva
- Primary: #135bec
- Button: #3498db
- Brand Blue: #1E3A8A
- Success: #16A34A
- Error: #e73c08
- Text: #111827
- Background: #f6f6f8
- Card: #ffffff
- Border: #e8eaf3
- Muted: #506295
- Font: Lexend (400, 500, 700)
