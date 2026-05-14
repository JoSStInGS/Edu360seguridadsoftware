# Secuencia Recomendada de Implementacion

## Proposito
Este archivo define el orden sugerido para ejecutar los planes del backlog
refinado sin perder el trabajo ya existente en el repositorio.

La secuencia combina:
- el orden funcional del backlog,
- las dependencias entre historias,
- y la prioridad tecnica de la migracion a Supabase.

Antes de empezar cualquier bloque, revisar tambien
`planes/PLAN_MIGRACION_SUPABASE.md`.

## Regla general de ejecucion
Para cada historia:
1. Abrir su plan en `planes-por-historia/`.
2. Revisar si el plan marca funcionalidad ya existente que debe migrarse o
   adaptarse.
3. Implementar solo lo necesario para cerrar criterios de aceptacion y DoD.
4. Validar regresion antes de pasar a la siguiente historia.

## Bloque 0 — Preparacion transversal obligatoria
Objetivo: dejar el terreno listo para que las historias base no se implementen
dos veces.

1. Ejecutar [PLAN_MIGRACION_SUPABASE.md](/Users/greivin/Documents/GitHub/Edu360/planes/PLAN_MIGRACION_SUPABASE.md)
   hasta cubrir:
   - esquema base,
   - estrategia Auth,
   - RLS inicial,
   - convenciones de `center_id`,
   - tipos TypeScript generados o planificados.
2. Usar como referencia complementaria:
   - [PLAN_PADRES.md](/Users/greivin/Documents/GitHub/Edu360/PLAN_PADRES.md)
   - [edu_mobile/PLAN.md](/Users/greivin/Documents/GitHub/Edu360/edu_mobile/PLAN.md)

## Bloque 1 — Identidad, sesion y administracion base
Objetivo: crear la columna vertebral del sistema y de la migracion.

1. `HU-16` — Sesion segura, cierre de sesion y acceso protegido.
2. `HU-24` — Gestion de usuarios y generacion de codigos.
3. `HU-01` — Registro con codigo de activacion.
4. `HU-02` — Inicio de sesion con dominios institucionales.
5. `HU-15` — Recuperacion y restablecimiento de contrasena.
6. `HU-34` — Inicio de sesion con Google OAuth en web y movil.
7. `HU-25` — Gestion de secciones, materias, horarios y calendario escolar.

### Por que este orden
- `HU-16` fija autorizacion, proteccion de rutas y validacion JWT.
- `HU-24` habilita usuarios y codigos, que luego usan `HU-01` y `HU-03`.
- `HU-01`, `HU-02`, `HU-15` y `HU-34` cierran el ciclo de acceso.
- `HU-25` deja listas las entidades maestras que sostienen asistencia,
  horarios e importaciones.

## Bloque 2 — Vinculacion familiar y presencia institucional
Objetivo: conectar usuarios, estudiantes y eventos de ingreso/salida.

1. `HU-03` — Vinculacion de estudiantes a encargados legales.
2. `HU-04` — Generacion segura de identificador QR.
3. `HU-05` — Registro de ingreso y estado activo en sede.
4. `HU-17` — Registro de salida y estado fuera de sede.
5. `HU-18` — Historial de ingresos y listado de estudiantes activos.

### Por que este orden
- `HU-03` habilita acceso familiar restringido.
- `HU-04` produce el mecanismo de identificacion.
- `HU-05` y `HU-17` completan presencia en sede.
- `HU-18` agrega consulta historica y vista operativa sobre lo anterior.

## Bloque 3 — Asistencia por clase y alertas operativas
Objetivo: cerrar el flujo academico-operativo mas sensible del producto.

1. `HU-06` — Toma de asistencia por clase.
2. `HU-19` — Modificacion controlada de asistencia del mismo dia.
3. `HU-20` — Alerta por asistencia no registrada en 15 minutos.
4. `HU-13` — Alertas de ausentismo critico.
5. `HU-29` — Dashboard administrativo de asistencia y operacion.

### Por que este orden
- `HU-06` crea el dato fuente.
- `HU-19` define correccion controlada del mismo.
- `HU-20` y `HU-13` agregan respuesta operativa.
- `HU-29` aprovecha esos datos para lectura gerencial.

## Bloque 4 — Justificaciones, ausencias y notificaciones
Objetivo: cerrar la relacion entre ausencia, resolucion y comunicacion.

1. `HU-07` — Envio de justificacion de ausencia.
2. `HU-08` — Aprobacion o rechazo de justificaciones.
3. `HU-21` — Solicitud de ausencia anticipada.
4. `HU-22` — Historial de solicitudes y consulta administrativa.
5. `HU-23` — Centro de notificaciones en app.

### Por que este orden
- `HU-07` y `HU-08` completan el flujo reactivo.
- `HU-21` agrega el flujo preventivo.
- `HU-22` unifica la consulta historica.
- `HU-23` concentra los eventos visibles para usuarios.

## Bloque 5 — Importaciones y configuracion operativa
Objetivo: acelerar la carga masiva y estabilizar datos de operacion.

1. `HU-11` — Importacion de horarios desde aSc Horarios.
2. `HU-12` — Importacion de estudiantes desde CSV.
3. `HU-14` — Exportacion de reportes PDF y Excel.

### Por que este orden
- `HU-11` y `HU-12` alimentan el sistema con datos base.
- `HU-14` aprovecha la informacion ya consolidada en bloques previos.

## Bloque 6 — Recursos y Classroom
Objetivo: construir la capa de contenido, tareas y seguimiento academico.

1. `HU-09` — Publicacion de recursos educativos.
2. `HU-28` — Consulta de recursos educativos publicados.
3. `HU-26` — Creacion y asignacion de tareas.
4. `HU-10` — Entrega de tareas con historial de envio.
5. `HU-27` — Revision de entregas, comentarios y puntuacion.
6. `HU-33` — Consulta de tareas, entregas y asistencia resumida para seguimiento.

### Por que este orden
- Primero se publica y consulta contenido.
- Luego se habilita el ciclo de tareas.
- `HU-33` consolida seguimiento una vez que ya existen datos de tareas y
  asistencia.

## Bloque 7 — Evaluaciones y resultados
Objetivo: completar el ciclo academico con resultados auditables.

1. `HU-30` — Registro de evaluaciones academicas.
2. `HU-31` — Registro y modificacion auditada de puntuaciones.
3. `HU-32` — Consulta de resultados publicados.

### Por que este orden
- `HU-30` define la estructura evaluativa.
- `HU-31` gestiona la puntuacion y su auditoria.
- `HU-32` publica resultados a los perfiles autorizados.

## Resumen corto del orden completo
```text
Migracion Supabase
  -> HU-16
  -> HU-24
  -> HU-01
  -> HU-02
  -> HU-15
  -> HU-34
  -> HU-25
  -> HU-03
  -> HU-04
  -> HU-05
  -> HU-17
  -> HU-18
  -> HU-06
  -> HU-19
  -> HU-20
  -> HU-13
  -> HU-29
  -> HU-07
  -> HU-08
  -> HU-21
  -> HU-22
  -> HU-23
  -> HU-11
  -> HU-12
  -> HU-14
  -> HU-09
  -> HU-28
  -> HU-26
  -> HU-10
  -> HU-27
  -> HU-33
  -> HU-30
  -> HU-31
  -> HU-32
```

## Nota de uso
Si quieres avanzar con el menor riesgo posible, toma los bloques en orden y no
saltes al siguiente hasta que:
- los criterios de aceptacion del bloque actual esten cubiertos,
- las pruebas de regresion relevantes pasen,
- y cualquier cambio transversal a Supabase quede documentado.
