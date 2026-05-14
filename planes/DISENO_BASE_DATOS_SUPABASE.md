# Diseño de Base de Datos Supabase

## Objetivo
Definir el esquema relacional inicial de Edu360 para migrar desde Firebase /
Firestore hacia Supabase/PostgreSQL, respetando el `backlog-refinado.md`, el SRS
existente y los planes de implementación por historia.

Este documento cubre la Fase 1 de `PLAN_MIGRACION_SUPABASE.md`:
- tablas maestras,
- tablas operativas,
- equivalencias Firestore -> PostgreSQL,
- convenciones de `center_id`, timestamps, auditoría y estados,
- primeras reglas RLS por dominio.

## Principios de diseño
- `center_id` es obligatorio en toda tabla tenant-scoped.
- La identidad vive en `auth.users`; los datos de producto viven en `profiles`.
- Los permisos no dependen del cliente: se aplican con RLS, funciones o endpoints
  server-side.
- Las tablas transaccionales no deben guardar arreglos grandes como Firestore;
  se normalizan en filas.
- Las acciones críticas generan auditoría.
- Los archivos viven en Supabase Storage; PostgreSQL guarda metadatos y relación
  con el dominio.
- Realtime se habilita solo en tablas donde exista valor funcional claro.

## Convenciones globales

### Tipos de identificadores
- Usar `uuid` como llave primaria en tablas nuevas.
- Usar `auth.users.id` como `uuid` para usuarios autenticados.
- Mantener identificaciones oficiales como campos únicos por centro, no como PK:
  - `students.identification`
  - `teachers.identification`

### Campos estándar
Toda tabla mutable debe incluir:

```sql
id uuid primary key default gen_random_uuid()
center_id uuid references centers(id)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
created_by uuid references auth.users(id)
updated_by uuid references auth.users(id)
status text not null
```

No todas las tablas requieren todos los campos. Tablas puente simples pueden usar
PK compuesta y timestamps mínimos.

### Estados recomendados
Los estados pueden implementarse como enums PostgreSQL o constraints `check`.
Para la primera migración se recomienda `text` + `check`, porque facilita ajustes
durante estabilización.

Roles:
- `super_admin`
- `center_admin`
- `professor`
- `student`
- `guardian`

Estados comunes:
- `active`
- `inactive`
- `archived`

Estados de código:
- `active`
- `consumed`
- `expired`
- `revoked`

Estados de asistencia:
- `present`
- `absent`
- `justified`
- `late`

Estados de solicitud:
- `pending`
- `approved`
- `rejected`
- `cancelled`

## Esquema base por dominio

### 1. Centros, perfiles y roles

#### `centers`
Representa cada institución educativa.

Campos principales:
- `id uuid pk`
- `name text not null`
- `official_code text null`
- `timezone text not null default 'America/Costa_Rica'`
- `status text not null default 'active'`
- `created_at`, `updated_at`

Constraints e índices:
- `unique (official_code)` cuando exista.
- índice por `status`.

RLS:
- `super_admin` puede ver todos.
- usuarios de centro solo ven su centro mediante `user_roles`.

#### `profiles`
Perfil de producto ligado a Supabase Auth.

Campos principales:
- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null`
- `mep_email text null`
- `display_name text not null`
- `first_name text null`
- `last_name text null`
- `photo_url text null`
- `provider text not null default 'email'`
- `status text not null default 'active'`
- `created_at`, `updated_at`

Constraints e índices:
- `unique (email)`
- `unique (mep_email)` cuando no sea null.

RLS:
- cada usuario puede leer su perfil.
- admins de centro pueden leer perfiles asociados a su centro por `user_roles`.

#### `user_roles`
Relación usuario-rol-centro. Permite roles múltiples y prepara super admin.

Campos principales:
- `id uuid pk`
- `user_id uuid not null references profiles(id)`
- `center_id uuid null references centers(id)`
- `role text not null`
- `is_active boolean not null default true`
- `created_at`, `created_by`

Constraints e índices:
- `unique (user_id, center_id, role)`
- `check (role in (...))`
- índice `(center_id, role, is_active)`
- índice `(user_id, is_active)`

RLS:
- usuario ve sus roles activos.
- `center_admin` ve roles de su centro.
- solo `center_admin` o `super_admin` mutan roles.

### 2. Configuración académica

#### `academic_periods`
Períodos lectivos por centro.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `name text not null`
- `start_date date not null`
- `end_date date not null`
- `is_active boolean not null default false`
- `status text not null default 'active'`
- timestamps estándar

Constraints:
- `unique (center_id, name)`
- un solo activo por centro mediante índice único parcial:
  `unique (center_id) where is_active = true`

#### `sections`
Secciones o grupos principales, por ejemplo `10-A`.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `level text null`
- `name text not null`
- `status text not null default 'active'`
- timestamps estándar

Constraints:
- `unique (center_id, academic_period_id, name)`

#### `subgroups`
Subgrupos opcionales dentro de una sección.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `section_id uuid not null references sections(id)`
- `name text not null`
- `status text not null default 'active'`

Constraints:
- `unique (section_id, name)`

#### `subjects`
Materias del centro.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `code text null`
- `name text not null`
- `status text not null default 'active'`

Constraints:
- `unique (center_id, name)`
- `unique (center_id, code)` cuando `code` no sea null.

#### `school_calendar_days`
Calendario escolar: feriados, días lectivos especiales y cierres.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `date date not null`
- `kind text not null` (`holiday`, `closure`, `special_day`)
- `label text not null`
- `metadata jsonb not null default '{}'`

Constraints:
- `unique (center_id, academic_period_id, date, kind)`

#### `teachers`
Ficha académica de profesor. Puede o no estar vinculada a un usuario Auth.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `profile_id uuid null references profiles(id)`
- `identification text null`
- `full_name text not null`
- `email text null`
- `status text not null default 'active'`
- timestamps estándar

Constraints:
- `unique (center_id, identification)` cuando no sea null.
- `unique (center_id, profile_id)` cuando no sea null.

#### `students`
Ficha académica de estudiante. Puede o no estar vinculada a un usuario Auth.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `profile_id uuid null references profiles(id)`
- `academic_period_id uuid not null`
- `section_id uuid not null references sections(id)`
- `subgroup_id uuid null references subgroups(id)`
- `identification text not null`
- `full_name text not null`
- `email text null`
- `status text not null default 'active'`
- timestamps estándar

Constraints:
- `unique (center_id, academic_period_id, identification)`
- índice `(center_id, academic_period_id, section_id)`

#### `teacher_subject_assignments`
Define qué profesor imparte qué materia a qué sección/subgrupo.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `teacher_id uuid not null references teachers(id)`
- `subject_id uuid not null references subjects(id)`
- `section_id uuid not null references sections(id)`
- `subgroup_id uuid null references subgroups(id)`
- `status text not null default 'active'`

Constraints:
- `unique (academic_period_id, teacher_id, subject_id, section_id, subgroup_id)`
- índice `(center_id, teacher_id, status)`

Esta tabla es clave para RLS de asistencia, recursos, tareas y evaluaciones.

#### `schedule_entries`
Bloques horarios importados o creados manualmente.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `assignment_id uuid not null references teacher_subject_assignments(id)`
- `day_of_week smallint not null` (`1` lunes a `7` domingo)
- `period_number int not null`
- `starts_at time not null`
- `ends_at time not null`
- `room text null`
- `source text not null default 'manual'`
- `status text not null default 'active'`

Constraints:
- `check (day_of_week between 1 and 7)`
- `check (starts_at < ends_at)`
- `unique (assignment_id, day_of_week, period_number)`
- índices para cruces:
  - `(center_id, academic_period_id, day_of_week)`
  - `(center_id, academic_period_id, assignment_id)`

### 3. Onboarding, códigos y vinculación familiar

#### `activation_codes`
Códigos para crear cuenta con rol y centro.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `code_hash text not null`
- `purpose text not null` (`registration`, `guardian_link`, `add_role`)
- `role text null`
- `academic_period_id uuid null`
- `expires_at timestamptz not null`
- `consumed_at timestamptz null`
- `consumed_by uuid null references profiles(id)`
- `created_by uuid not null references profiles(id)`
- `status text not null default 'active'`
- `metadata jsonb not null default '{}'`

Constraints:
- `unique (center_id, code_hash)`
- `check (purpose in ('registration', 'guardian_link', 'add_role'))`
- si `purpose = 'registration'`, `role` debe no ser null.

Nota:
- Guardar hash del código, no el código plano.
- La validación/consumo debe ocurrir en RPC transaccional o Edge Function.

#### `activation_code_students`
Estudiantes asociados a un código de vinculación familiar.

Campos:
- `activation_code_id uuid references activation_codes(id) on delete cascade`
- `student_id uuid references students(id) on delete cascade`
- `center_id uuid not null`
- `created_at timestamptz default now()`

PK:
- `(activation_code_id, student_id)`

#### `guardian_students`
Relación encargado-estudiante.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `guardian_id uuid not null references profiles(id)`
- `student_id uuid not null references students(id)`
- `linked_via text not null` (`registration_code`, `admin_manual`, `additional_code`)
- `consent_accepted_at timestamptz not null`
- `consent_version text not null`
- `status text not null default 'active'`
- `created_at`, `created_by`

Constraints:
- `unique (guardian_id, student_id)`
- índice `(center_id, student_id, status)`
- índice `(center_id, guardian_id, status)`

RLS:
- encargado lee sus filas activas.
- encargado accede a datos del estudiante solo mediante relación activa.
- admin del centro puede gestionar relaciones de su centro.

### 4. Presencia institucional por QR

#### `student_qr_tokens`
Tokens emitidos para ingreso/salida.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `student_id uuid not null references students(id)`
- `token_hash text not null`
- `expires_at timestamptz null`
- `revoked_at timestamptz null`
- `status text not null default 'active'`
- `created_at`, `created_by`

Constraints:
- `unique (token_hash)`
- índice `(student_id, status)`

#### `student_presence_events`
Eventos de ingreso/salida.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `student_id uuid not null references students(id)`
- `event_type text not null` (`entry`, `exit`)
- `event_at timestamptz not null default now()`
- `registered_by uuid null references profiles(id)`
- `source text not null` (`qr`, `manual`, `import`)
- `notes text null`
- `created_at`

Índices:
- `(center_id, event_at desc)`
- `(center_id, student_id, event_at desc)`

Vista recomendada:
- `current_student_presence` para obtener estado actual en sede.

### 5. Asistencia por clase

#### `attendance_sessions`
Cabecera de asistencia por clase/horario/fecha.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `schedule_entry_id uuid not null references schedule_entries(id)`
- `assignment_id uuid not null references teacher_subject_assignments(id)`
- `attendance_date date not null`
- `taken_by uuid not null references profiles(id)`
- `taken_at timestamptz not null default now()`
- `status text not null default 'submitted'`
- `created_at`, `updated_at`

Constraints:
- `unique (schedule_entry_id, attendance_date)`
- no crear si `school_calendar_days.kind in ('holiday', 'closure')`.

#### `attendance_records`
Detalle por estudiante.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `attendance_session_id uuid not null references attendance_sessions(id) on delete cascade`
- `student_id uuid not null references students(id)`
- `status text not null` (`present`, `absent`, `justified`, `late`)
- `notes text null`
- `created_at`, `updated_at`

Constraints:
- `unique (attendance_session_id, student_id)`
- índice `(center_id, student_id, created_at desc)`

#### `attendance_change_logs`
Auditoría de modificaciones de asistencia.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `attendance_record_id uuid not null references attendance_records(id)`
- `old_status text not null`
- `new_status text not null`
- `reason text not null`
- `changed_by uuid not null references profiles(id)`
- `changed_at timestamptz not null default now()`

Uso:
- HU-19 exige trazabilidad al modificar asistencia del mismo día.

### 6. Solicitudes de ausencia y justificaciones

#### `absence_requests`
Unifica justificaciones posteriores y ausencias anticipadas.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `student_id uuid not null references students(id)`
- `guardian_id uuid not null references profiles(id)`
- `request_type text not null` (`justification`, `anticipated_absence`)
- `status text not null default 'pending'`
- `reason text not null`
- `starts_on date not null`
- `ends_on date not null`
- `submitted_at timestamptz not null default now()`
- `resolved_at timestamptz null`
- `resolved_by uuid null references profiles(id)`
- `resolution_comment text null`
- `created_at`, `updated_at`

Constraints:
- `check (starts_on <= ends_on)`
- índice `(center_id, student_id, submitted_at desc)`
- índice `(center_id, status, submitted_at desc)`

#### `absence_request_schedule_entries`
Vincula una solicitud con clases específicas cuando aplique.

Campos:
- `absence_request_id uuid references absence_requests(id) on delete cascade`
- `schedule_entry_id uuid references schedule_entries(id)`
- `center_id uuid not null`

PK:
- `(absence_request_id, schedule_entry_id)`

#### `absence_request_attachments`
Metadata de archivos en Supabase Storage.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `absence_request_id uuid not null references absence_requests(id) on delete cascade`
- `bucket text not null`
- `object_path text not null`
- `file_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `uploaded_by uuid not null references profiles(id)`
- `created_at timestamptz default now()`

Storage bucket sugerido:
- `absence-attachments`

### 7. Comunicados y notificaciones

#### `messages`
Comunicados creados por profesores o administración.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `sender_id uuid not null references profiles(id)`
- `subject text not null`
- `body text not null`
- `target_type text not null` (`student`, `guardian`, `section`, `assignment`)
- `created_at`, `updated_at`

#### `message_recipients`
Destinatarios normalizados.

Campos:
- `message_id uuid references messages(id) on delete cascade`
- `recipient_id uuid references profiles(id)`
- `center_id uuid not null`
- `read_at timestamptz null`

PK:
- `(message_id, recipient_id)`

#### `notifications`
Centro de notificaciones in-app.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `recipient_id uuid not null references profiles(id)`
- `event_type text not null`
- `title text not null`
- `body text not null`
- `entity_type text null`
- `entity_id uuid null`
- `delivery_channels text[] not null default array['in_app']`
- `read_at timestamptz null`
- `created_at timestamptz not null default now()`

Índices:
- `(recipient_id, read_at, created_at desc)`
- `(center_id, event_type, created_at desc)`

Realtime:
- buen candidato para suscripciones por `recipient_id`.

#### `push_tokens`
Tokens FCM por dispositivo.

Campos:
- `id uuid pk`
- `profile_id uuid not null references profiles(id)`
- `platform text not null` (`ios`, `android`, `web`)
- `token text not null`
- `status text not null default 'active'`
- `last_seen_at timestamptz null`
- `created_at`

Constraints:
- `unique (token)`

### 8. Recursos educativos y Classroom

#### `educational_resources`
Metadatos de recursos publicados.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `author_id uuid not null references profiles(id)`
- `assignment_id uuid null references teacher_subject_assignments(id)`
- `section_id uuid null references sections(id)`
- `subgroup_id uuid null references subgroups(id)`
- `title text not null`
- `description text null`
- `resource_type text not null` (`file`, `external_link`)
- `external_url text null`
- `bucket text null`
- `object_path text null`
- `visibility text not null default 'students'`
- `status text not null default 'published'`
- `created_at`, `updated_at`

Storage bucket sugerido:
- `educational-resources`

#### `classroom_tasks`
Tareas creadas por profesores.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `author_id uuid not null references profiles(id)`
- `assignment_id uuid not null references teacher_subject_assignments(id)`
- `title text not null`
- `instructions text not null`
- `due_at timestamptz not null`
- `accepts_text boolean not null default true`
- `accepts_files boolean not null default true`
- `is_gradable boolean not null default false`
- `max_score numeric(8,2) null`
- `status text not null default 'published'`
- `created_at`, `updated_at`

#### `classroom_task_attachments`
Archivos de apoyo de una tarea.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `task_id uuid not null references classroom_tasks(id) on delete cascade`
- `bucket text not null`
- `object_path text not null`
- `file_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `created_at`

#### `task_submissions`
Entregas estudiantiles. Cada envío conserva evidencia.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `task_id uuid not null references classroom_tasks(id)`
- `student_id uuid not null references students(id)`
- `submitted_by uuid null references profiles(id)`
- `submission_text text null`
- `submitted_at timestamptz not null default now()`
- `is_late boolean not null default false`
- `review_status text not null default 'pending'`
- `review_comment text null`
- `reviewed_by uuid null references profiles(id)`
- `reviewed_at timestamptz null`
- `score numeric(8,2) null`

Índices:
- `(task_id, student_id, submitted_at desc)`
- `(center_id, student_id, submitted_at desc)`

#### `task_submission_attachments`
Archivos enviados por estudiantes.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `submission_id uuid not null references task_submissions(id) on delete cascade`
- `bucket text not null`
- `object_path text not null`
- `file_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `created_at`

Storage bucket sugerido:
- `classroom-submissions`

### 9. Evaluaciones y resultados académicos

#### `evaluations`
Definición de evaluaciones.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid not null`
- `assignment_id uuid not null references teacher_subject_assignments(id)`
- `created_by uuid not null references profiles(id)`
- `title text not null`
- `evaluation_type text not null`
- `evaluation_date date not null`
- `max_score numeric(8,2) not null`
- `status text not null default 'pending'`
- `published_at timestamptz null`
- `created_at`, `updated_at`

Estados sugeridos:
- `pending`
- `applied`
- `graded`
- `published`
- `expired`

#### `evaluation_scores`
Puntuaciones por estudiante.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `evaluation_id uuid not null references evaluations(id) on delete cascade`
- `student_id uuid not null references students(id)`
- `score numeric(8,2) not null`
- `comment text null`
- `recorded_by uuid not null references profiles(id)`
- `recorded_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- `unique (evaluation_id, student_id)`
- score no debe superar `evaluations.max_score`; validar con trigger o RPC.

#### `evaluation_score_audit_logs`
Auditoría de cambios de puntuación.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `evaluation_score_id uuid not null references evaluation_scores(id)`
- `old_score numeric(8,2) null`
- `new_score numeric(8,2) not null`
- `old_comment text null`
- `new_comment text null`
- `changed_by uuid not null references profiles(id)`
- `changed_at timestamptz not null default now()`

### 10. Importaciones, auditoría y reportes

#### `import_jobs`
Registro de importaciones CSV/aSc.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `academic_period_id uuid null`
- `import_type text not null` (`students_csv`, `asc_schedule`)
- `status text not null default 'pending'`
- `file_name text null`
- `total_rows int not null default 0`
- `success_rows int not null default 0`
- `failed_rows int not null default 0`
- `warning_rows int not null default 0`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz default now()`
- `completed_at timestamptz null`

#### `import_job_errors`
Errores por fila o validación.

Campos:
- `id uuid pk`
- `center_id uuid not null`
- `import_job_id uuid not null references import_jobs(id) on delete cascade`
- `row_number int null`
- `severity text not null` (`error`, `warning`)
- `code text not null`
- `message text not null`
- `raw_data jsonb null`

#### `audit_logs`
Auditoría general de acciones críticas.

Campos:
- `id uuid pk`
- `center_id uuid null`
- `actor_id uuid null references profiles(id)`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `old_data jsonb null`
- `new_data jsonb null`
- `ip_address inet null`
- `user_agent text null`
- `created_at timestamptz not null default now()`

Uso:
- usuarios/códigos,
- asistencia,
- importaciones,
- justificaciones,
- evaluaciones y puntuaciones.

## Equivalencias Firestore -> PostgreSQL

| Firestore | Supabase/PostgreSQL |
|---|---|
| `users/{uid}` | `profiles`, `user_roles`, `teachers`, `students` |
| `centers/{centerId}` | `centers` |
| `centers/{centerId}/register_codes/{code}` | `activation_codes`, `activation_code_students` |
| `centers/{centerId}/periods/{periodId}` | `academic_periods` |
| `periods/{periodId}/students/{cedula}` | `students` |
| `periods/{periodId}/profesores/{profesorId}` | `teachers` |
| `periods/{periodId}/schedules/{scheduleId}` | `teacher_subject_assignments`, `schedule_entries` |
| `periods/{periodId}/attendance/{grupoId_fecha_scheduleId}` | `attendance_sessions`, `attendance_records` |
| `periods/{periodId}/parent_students/{autoId}` | `guardian_students` |
| `periods/{periodId}/justifications/{id}` | `absence_requests`, `absence_request_attachments` |
| `periods/{periodId}/comunicados/{id}` | `messages`, `message_recipients` |
| `periods/{periodId}/teacher_absences/{id}` | `absence_requests` o tabla futura `teacher_absences` si se separa el dominio docente |

## RLS inicial por grupo de tablas

### Helpers recomendados
Crear funciones SQL `security definer` para evitar duplicar lógica:

- `auth.uid()` como usuario actual.
- `is_super_admin()`
- `has_center_role(center_id uuid, roles text[])`
- `is_assigned_teacher(assignment_id uuid)`
- `is_guardian_of_student(student_id uuid)`
- `is_student_profile(student_id uuid)`

### Reglas base
- `center_admin` puede administrar datos de su `center_id`.
- `professor` puede leer configuración académica de su centro y operar solo sus
  asignaciones.
- `guardian` puede leer solo estudiantes vinculados y datos publicados/autorizados.
- `student` puede leer solo sus datos y recursos/resultados publicados.
- `super_admin` puede gestionar centros y leer globalmente.

### Tablas con RLS prioritario
Primera ola:
- `profiles`
- `user_roles`
- `centers`
- `academic_periods`
- `students`
- `teachers`
- `teacher_subject_assignments`
- `schedule_entries`
- `activation_codes`
- `guardian_students`
- `attendance_sessions`
- `attendance_records`
- `absence_requests`
- `notifications`

Segunda ola:
- Storage metadata,
- Classroom,
- recursos,
- evaluaciones,
- reportes agregados.

## Storage buckets sugeridos

| Bucket | Uso | Acceso |
|---|---|---|
| `absence-attachments` | Comprobantes de justificaciones | Encargado dueño, profesor autorizado, admin centro |
| `educational-resources` | Materiales publicados | Profesor autor, estudiantes/encargados autorizados |
| `classroom-task-files` | Archivos de apoyo de tareas | Profesor autor, estudiantes destino |
| `classroom-submissions` | Evidencias de entregas | Estudiante dueño, profesor autorizado |
| `profile-media` | Avatares o media de perfil | Usuario dueño, lectura controlada |

Convención de path:

```text
{center_id}/{academic_period_id}/{domain}/{entity_id}/{filename}
```

## Vistas y RPCs recomendadas

### Vistas
- `active_user_context`
  - roles activos del usuario, centro y perfil.
- `current_student_presence`
  - último evento de presencia por estudiante.
- `guardian_student_summary`
  - estudiantes visibles para cada encargado.
- `teacher_schedule_view`
  - horario consumible por web/mobile.
- `attendance_summary_by_student`
  - resumen por estudiante/materia/período.
- `admin_attendance_dashboard`
  - agregados para HU-29.

### RPCs / Edge Functions
- `consume_activation_code`
  - valida hash, expiración y consumo único.
- `link_guardian_students`
  - crea vínculos y consentimiento de forma transaccional.
- `record_attendance_session`
  - crea cabecera y detalles de asistencia.
- `update_attendance_record_same_day`
  - valida ventana de edición y escribe auditoría.
- `create_absence_request`
  - valida vínculo y adjuntos.
- `record_evaluation_scores`
  - valida máximo y auditoría.

## Índices iniciales recomendados

```sql
-- Multi-tenant y roles
create index on user_roles (user_id, is_active);
create index on user_roles (center_id, role, is_active);

-- Configuración académica
create index on students (center_id, academic_period_id, section_id);
create index on teachers (center_id, profile_id);
create index on teacher_subject_assignments (center_id, teacher_id, status);
create index on schedule_entries (center_id, academic_period_id, day_of_week);

-- Familia y asistencia
create index on guardian_students (center_id, guardian_id, status);
create index on guardian_students (center_id, student_id, status);
create index on attendance_sessions (center_id, attendance_date);
create index on attendance_records (center_id, student_id, created_at desc);

-- Solicitudes y notificaciones
create index on absence_requests (center_id, student_id, submitted_at desc);
create index on absence_requests (center_id, status, submitted_at desc);
create index on notifications (recipient_id, read_at, created_at desc);

-- Auditoría
create index on audit_logs (center_id, created_at desc);
create index on audit_logs (entity_type, entity_id);
```

## Orden recomendado para convertir este diseño en migraciones

1. Extensiones, helpers de timestamps y enums/checks.
2. `centers`, `profiles`, `user_roles`.
3. Configuración académica:
   - `academic_periods`,
   - `sections`,
   - `subgroups`,
   - `subjects`,
   - `teachers`,
   - `students`,
   - `teacher_subject_assignments`,
   - `schedule_entries`,
   - `school_calendar_days`.
4. Onboarding:
   - `activation_codes`,
   - `activation_code_students`,
   - `guardian_students`.
5. Asistencia y presencia:
   - QR,
   - presencia,
   - asistencia,
   - logs de cambio.
6. Solicitudes, mensajes y notificaciones.
7. Storage metadata.
8. Classroom, recursos y evaluaciones.
9. Vistas, RPCs, RLS y policies.
10. Seeds mínimos y datos de prueba.

## Decisiones pendientes antes de escribir SQL final

- Si los estudiantes tendrán cuenta Supabase Auth desde el inicio o solo ficha
  académica hasta que se active su acceso.
- Si `super_admin` tendrá `center_id = null` en `user_roles` o un centro especial.
- Si los códigos se consumirán con RPC SQL o Edge Function. Recomendación:
  RPC para transacción pura, Edge Function si se combina con Supabase Auth Admin.
- Si `teacher_absences` queda como tabla propia o se modela dentro de
  `absence_requests` con otro tipo de solicitante.
- Estrategia exacta de Realtime para asistencia visible por encargados:
  suscribirse a `attendance_records` filtrado por relaciones puede requerir
  vistas/RPC o canal controlado server-side.

## Resultado de Fase 1
Con este diseño, la Fase 1 queda lista para pasar a una primera migración SQL
controlada. La implementación debe empezar por identidad, roles, centros y
catálogos académicos, porque casi todos los módulos dependen de esas relaciones.
