# Plan Transversal de Migracion a Supabase

## Objetivo
Coordinar el cambio de backend descrito en `backlog-refinado.md` sin perder el
trabajo ya realizado sobre Firebase. Este plan no sustituye los planes por
modulo; funciona como marco tecnico para que cada plan existente hable de
adaptar y migrar en lugar de reconstruir.

## Principios
- Conservar UX, pantallas y flujos que ya cumplen la intencion funcional.
- Cambiar persistencia, autenticacion, permisos y contratos donde el backlog lo
  exige.
- Evitar doble implementacion permanente entre Firebase y Supabase.
- Migrar por dominios funcionales con pruebas de regresion antes de retirar lo
  anterior.
- No usar un `.env` global compartido. Cada aplicacion debe mantener sus
  propias variables de entorno; el repo raiz queda solo para tooling como
  Supabase CLI.
- Diferir la app movil hasta la fase final, porque su tecnologia objetivo va a
  cambiar. La implementacion actual en React Native/Expo no guia el camino
  critico de la migracion.

## Historias y tareas transversales que fijan la migracion
- HU-01, HU-02, HU-15, HU-16, HU-24 y HU-34 para identidad, onboarding y
  administracion base.
- HU-03, HU-06, HU-18, HU-22, HU-28, HU-31 y HU-32 para RLS por dominio.
- HU-07, HU-09, HU-10, HU-27 y HU-28 para Supabase Storage.
- Generacion de tipos TypeScript desde PostgreSQL y separacion de entornos como
  trabajo tecnico transversal.

## Fase 1 — Diseno del esquema base
Documento de diseño: `planes/DISENO_BASE_DATOS_SUPABASE.md`.

- [x] Definir tablas maestras de:
  - centros,
  - perfiles,
  - roles,
  - periodos,
  - estudiantes,
  - profesores,
  - secciones,
  - horarios.
- [x] Definir tablas operativas de:
  - codigos,
  - vinculaciones familiares,
  - asistencia,
  - solicitudes,
  - notificaciones.
- [x] Identificar equivalencias Firestore -> PostgreSQL antes de tocar cada
      modulo.
- [x] Crear convenciones de `center_id`, timestamps, auditoria y estados activos.

## Fase 2 — Autenticacion, sesion y administracion
- [ ] Migrar Auth a Supabase para web.
- [ ] Resolver `profiles` y `user_roles`.
- [ ] Implementar validacion JWT server-side y helpers SSR en web.
- [ ] Migrar generacion de codigos, activacion y gestion administrativa de HU-24.
- [ ] Preparar recuperacion de contrasena y OAuth web segun HU-15/HU-34.

## Fase 3 — RLS y contratos seguros
- [ ] Definir policies por:
  - centro educativo,
  - rol,
  - profesor asignado,
  - estudiante vinculado.
- [ ] Evitar que el cliente necesite filtros inseguros para "simular" permisos.
- [ ] Crear vistas, RPCs o Edge Functions cuando una consulta cruce dominios o
      necesite transaccion.
- [ ] Documentar que HU valida cada policy.

## Fase 4 — Migracion por dominio funcional
- [ ] Usuarios y onboarding.
- [ ] Asistencia y horarios.
- [ ] Encargados legales y justificaciones.
- [ ] Comunicados y notificaciones.
- [ ] Recursos, tareas y evaluaciones cuando sus modulos entren en ejecucion.

## Fase 5 — Storage, Realtime y eventos
- [ ] Migrar adjuntos a Supabase Storage con policies por caso de uso.
- [ ] Definir donde usar Realtime y donde usar polling/refresco controlado.
- [ ] Separar notificacion persistida en app de push externo por FCM.

## Fase 6 — Calidad, corte y retiro de legado
- [ ] Agregar pruebas de regresion para cada dominio migrado.
- [ ] Confirmar cobertura de acceso autorizado/no autorizado.
- [ ] Verificar entornos dev/staging/prod con variables separadas por aplicacion.
- [ ] Retirar dependencias Firebase por modulo solo despues de su reemplazo.
- [ ] Actualizar README y planes afectados cuando una fase se complete.

## Orden recomendado de ejecucion
```text
Esquema base
  -> Auth y administracion
  -> RLS y contratos seguros
  -> Migracion funcional por dominio
  -> Storage / Realtime / notificaciones
  -> Corte y retiro de legado
```

## Relacion con los planes existentes
- `PLAN_PADRES.md` debe seguir este plan para toda la experiencia de encargados.
- `edu_mobile/PLAN.md` debe seguir este plan para auth, sesion, asistencia y
  almacenamiento.
- Cualquier plan nuevo del backlog debe aclarar que parte adapta trabajo
  existente y que parte introduce funcionalidad nueva.
