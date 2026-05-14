-- Edu360 initial Supabase/PostgreSQL schema.
-- Source documents:
-- - backlog-refinado.md
-- - planes/DISENO_BASE_DATOS_SUPABASE.md
-- - planes/PLAN_MIGRACION_SUPABASE.md

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_actor_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Centers, profiles and roles
-- ---------------------------------------------------------------------------

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  official_code text,
  timezone text not null default 'America/Costa_Rica',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint centers_status_check check (status in ('active', 'inactive', 'archived'))
);

create unique index centers_official_code_uidx
  on public.centers (official_code)
  where official_code is not null;

create index centers_status_idx on public.centers (status);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  mep_email text,
  display_name text not null,
  first_name text,
  last_name text,
  photo_url text,
  provider text not null default 'email',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_provider_check check (provider in ('email', 'google', 'microsoft', 'import')),
  constraint profiles_status_check check (status in ('active', 'inactive', 'archived'))
);

create unique index profiles_email_uidx on public.profiles (lower(email));
create unique index profiles_mep_email_uidx
  on public.profiles (lower(mep_email))
  where mep_email is not null;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  center_id uuid references public.centers(id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint user_roles_role_check check (
    role in ('super_admin', 'center_admin', 'professor', 'student', 'guardian')
  ),
  constraint user_roles_super_admin_center_check check (
    (role = 'super_admin' and center_id is null)
    or (role <> 'super_admin' and center_id is not null)
  )
);

create unique index user_roles_user_center_role_uidx
  on public.user_roles (user_id, center_id, role);
create unique index user_roles_single_super_admin_uidx
  on public.user_roles (user_id, role)
  where role = 'super_admin';
create index user_roles_user_active_idx on public.user_roles (user_id, is_active);
create index user_roles_center_role_active_idx on public.user_roles (center_id, role, is_active);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    mep_email,
    display_name,
    first_name,
    last_name,
    photo_url,
    provider
  ) values (
    new.id,
    lower(new.email),
    nullif(lower(new.raw_user_meta_data->>'mep_email'), ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(nullif(new.raw_app_meta_data->>'provider', ''), 'email')
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    photo_url = coalesce(excluded.photo_url, public.profiles.photo_url),
    provider = excluded.provider,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Academic setup
-- ---------------------------------------------------------------------------

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint academic_periods_dates_check check (start_date <= end_date),
  constraint academic_periods_status_check check (status in ('active', 'inactive', 'archived')),
  constraint academic_periods_center_name_uidx unique (center_id, name)
);

create unique index academic_periods_one_active_per_center_uidx
  on public.academic_periods (center_id)
  where is_active = true;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  level text,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint sections_status_check check (status in ('active', 'inactive', 'archived')),
  constraint sections_center_period_name_uidx unique (center_id, academic_period_id, name)
);

create table public.subgroups (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint subgroups_status_check check (status in ('active', 'inactive', 'archived')),
  constraint subgroups_section_name_uidx unique (section_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  code text,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint subjects_status_check check (status in ('active', 'inactive', 'archived')),
  constraint subjects_center_name_uidx unique (center_id, name)
);

create unique index subjects_center_code_uidx
  on public.subjects (center_id, code)
  where code is not null;

create table public.school_calendar_days (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  date date not null,
  kind text not null,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint school_calendar_days_kind_check check (kind in ('holiday', 'closure', 'special_day')),
  constraint school_calendar_days_uidx unique (center_id, academic_period_id, date, kind)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  identification text,
  full_name text not null,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint teachers_status_check check (status in ('active', 'inactive', 'archived'))
);

create unique index teachers_center_identification_uidx
  on public.teachers (center_id, identification)
  where identification is not null;
create unique index teachers_center_profile_uidx
  on public.teachers (center_id, profile_id)
  where profile_id is not null;
create index teachers_center_profile_idx on public.teachers (center_id, profile_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  section_id uuid not null references public.sections(id),
  subgroup_id uuid references public.subgroups(id),
  identification text not null,
  full_name text not null,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint students_status_check check (status in ('active', 'inactive', 'archived')),
  constraint students_center_period_identification_uidx unique (center_id, academic_period_id, identification)
);

create unique index students_center_profile_uidx
  on public.students (center_id, profile_id)
  where profile_id is not null;
create index students_center_period_section_idx
  on public.students (center_id, academic_period_id, section_id);

create table public.teacher_subject_assignments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  subject_id uuid not null references public.subjects(id),
  section_id uuid not null references public.sections(id),
  subgroup_id uuid references public.subgroups(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint teacher_subject_assignments_status_check check (status in ('active', 'inactive', 'archived'))
);

create unique index teacher_subject_assignments_scope_uidx
  on public.teacher_subject_assignments (
    academic_period_id,
    teacher_id,
    subject_id,
    section_id,
    coalesce(subgroup_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index teacher_subject_assignments_center_teacher_idx
  on public.teacher_subject_assignments (center_id, teacher_id, status);
create index teacher_subject_assignments_center_period_idx
  on public.teacher_subject_assignments (center_id, academic_period_id, status);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  assignment_id uuid not null references public.teacher_subject_assignments(id),
  day_of_week smallint not null,
  period_number int not null,
  starts_at time not null,
  ends_at time not null,
  room text,
  source text not null default 'manual',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint schedule_entries_day_check check (day_of_week between 1 and 7),
  constraint schedule_entries_time_check check (starts_at < ends_at),
  constraint schedule_entries_source_check check (source in ('manual', 'asc_import', 'migration')),
  constraint schedule_entries_status_check check (status in ('active', 'inactive', 'archived')),
  constraint schedule_entries_assignment_day_period_uidx unique (assignment_id, day_of_week, period_number)
);

create index schedule_entries_center_period_day_idx
  on public.schedule_entries (center_id, academic_period_id, day_of_week);
create index schedule_entries_center_period_assignment_idx
  on public.schedule_entries (center_id, academic_period_id, assignment_id);

-- ---------------------------------------------------------------------------
-- 3. Onboarding, codes and family links
-- ---------------------------------------------------------------------------

create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  code_hash text not null,
  purpose text not null,
  role text,
  academic_period_id uuid references public.academic_periods(id) on delete set null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint activation_codes_purpose_check check (purpose in ('registration', 'guardian_link', 'add_role')),
  constraint activation_codes_role_check check (
    role is null or role in ('center_admin', 'professor', 'student', 'guardian')
  ),
  constraint activation_codes_status_check check (status in ('active', 'consumed', 'expired', 'revoked')),
  constraint activation_codes_registration_role_check check (
    (purpose = 'registration' and role is not null) or purpose <> 'registration'
  ),
  constraint activation_codes_consumed_status_check check (
    (status = 'consumed' and consumed_at is not null)
    or (status <> 'consumed')
  ),
  constraint activation_codes_center_hash_uidx unique (center_id, code_hash)
);

create index activation_codes_center_status_idx on public.activation_codes (center_id, status);
create index activation_codes_expires_at_idx on public.activation_codes (expires_at);

create table public.activation_code_students (
  activation_code_id uuid not null references public.activation_codes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activation_code_id, student_id)
);

create index activation_code_students_center_idx
  on public.activation_code_students (center_id, student_id);

create table public.guardian_students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  linked_via text not null,
  consent_accepted_at timestamptz not null,
  consent_version text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint guardian_students_linked_via_check check (
    linked_via in ('registration_code', 'admin_manual', 'additional_code')
  ),
  constraint guardian_students_status_check check (status in ('active', 'inactive', 'archived')),
  constraint guardian_students_guardian_student_uidx unique (guardian_id, student_id)
);

create index guardian_students_center_guardian_idx
  on public.guardian_students (center_id, guardian_id, status);
create index guardian_students_center_student_idx
  on public.guardian_students (center_id, student_id, status);

-- ---------------------------------------------------------------------------
-- 4. QR institutional presence
-- ---------------------------------------------------------------------------

create table public.student_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint student_qr_tokens_status_check check (status in ('active', 'inactive', 'revoked', 'expired')),
  constraint student_qr_tokens_hash_uidx unique (token_hash)
);

create index student_qr_tokens_student_status_idx on public.student_qr_tokens (student_id, status);

create table public.student_presence_events (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  registered_by uuid references public.profiles(id),
  source text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint student_presence_events_type_check check (event_type in ('entry', 'exit')),
  constraint student_presence_events_source_check check (source in ('qr', 'manual', 'import'))
);

create index student_presence_events_center_event_idx
  on public.student_presence_events (center_id, event_at desc);
create index student_presence_events_student_event_idx
  on public.student_presence_events (center_id, student_id, event_at desc);

-- ---------------------------------------------------------------------------
-- 5. Class attendance
-- ---------------------------------------------------------------------------

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  schedule_entry_id uuid not null references public.schedule_entries(id),
  assignment_id uuid not null references public.teacher_subject_assignments(id),
  attendance_date date not null,
  taken_by uuid not null references public.profiles(id),
  taken_at timestamptz not null default now(),
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint attendance_sessions_status_check check (status in ('draft', 'submitted', 'corrected', 'void')),
  constraint attendance_sessions_schedule_date_uidx unique (schedule_entry_id, attendance_date)
);

create index attendance_sessions_center_date_idx on public.attendance_sessions (center_id, attendance_date);
create index attendance_sessions_assignment_date_idx on public.attendance_sessions (assignment_id, attendance_date);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id),
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint attendance_records_status_check check (status in ('present', 'absent', 'justified', 'late')),
  constraint attendance_records_session_student_uidx unique (attendance_session_id, student_id)
);

create index attendance_records_center_student_created_idx
  on public.attendance_records (center_id, student_id, created_at desc);
create index attendance_records_session_status_idx
  on public.attendance_records (attendance_session_id, status);

create table public.attendance_change_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  old_status text not null,
  new_status text not null,
  reason text not null,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now(),
  constraint attendance_change_logs_old_status_check check (old_status in ('present', 'absent', 'justified', 'late')),
  constraint attendance_change_logs_new_status_check check (new_status in ('present', 'absent', 'justified', 'late'))
);

create index attendance_change_logs_record_idx on public.attendance_change_logs (attendance_record_id, changed_at desc);
create index attendance_change_logs_center_changed_idx on public.attendance_change_logs (center_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- 6. Absence requests, justifications and teacher absences
-- ---------------------------------------------------------------------------

create table public.absence_requests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id),
  guardian_id uuid not null references public.profiles(id),
  request_type text not null,
  status text not null default 'pending',
  reason text not null,
  starts_on date not null,
  ends_on date not null,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolution_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint absence_requests_type_check check (request_type in ('justification', 'anticipated_absence')),
  constraint absence_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint absence_requests_dates_check check (starts_on <= ends_on)
);

create index absence_requests_center_student_submitted_idx
  on public.absence_requests (center_id, student_id, submitted_at desc);
create index absence_requests_center_status_submitted_idx
  on public.absence_requests (center_id, status, submitted_at desc);
create index absence_requests_guardian_idx
  on public.absence_requests (guardian_id, submitted_at desc);

create table public.absence_request_schedule_entries (
  absence_request_id uuid not null references public.absence_requests(id) on delete cascade,
  schedule_entry_id uuid not null references public.schedule_entries(id),
  center_id uuid not null references public.centers(id) on delete cascade,
  primary key (absence_request_id, schedule_entry_id)
);

create index absence_request_schedule_entries_schedule_idx
  on public.absence_request_schedule_entries (schedule_entry_id);

create table public.absence_request_attachments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  absence_request_id uuid not null references public.absence_requests(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint absence_request_attachments_size_check check (size_bytes > 0),
  constraint absence_request_attachments_object_uidx unique (bucket, object_path)
);

create table public.teacher_absences (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint teacher_absences_dates_check check (starts_on <= ends_on),
  constraint teacher_absences_status_check check (status in ('active', 'inactive', 'archived', 'cancelled'))
);

create index teacher_absences_teacher_dates_idx on public.teacher_absences (teacher_id, starts_on, ends_on);

-- ---------------------------------------------------------------------------
-- 7. Messages and notifications
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  subject text not null,
  body text not null,
  target_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint messages_target_type_check check (target_type in ('student', 'guardian', 'section', 'assignment'))
);

create index messages_center_created_idx on public.messages (center_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

create table public.message_recipients (
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (message_id, recipient_id)
);

create index message_recipients_recipient_idx
  on public.message_recipients (recipient_id, read_at, created_at desc);

create table public.message_replies (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index message_replies_message_created_idx
  on public.message_replies (message_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  delivery_channels text[] not null default array['in_app']::text[],
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_read_created_idx
  on public.notifications (recipient_id, read_at, created_at desc);
create index notifications_center_event_created_idx
  on public.notifications (center_id, event_type, created_at desc);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  token text not null,
  status text not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_platform_check check (platform in ('ios', 'android', 'web')),
  constraint push_tokens_status_check check (status in ('active', 'inactive', 'revoked')),
  constraint push_tokens_token_uidx unique (token)
);

create index push_tokens_profile_status_idx on public.push_tokens (profile_id, status);

-- ---------------------------------------------------------------------------
-- 8. Educational resources and Classroom
-- ---------------------------------------------------------------------------

create table public.educational_resources (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  assignment_id uuid references public.teacher_subject_assignments(id),
  section_id uuid references public.sections(id),
  subgroup_id uuid references public.subgroups(id),
  title text not null,
  description text,
  resource_type text not null,
  external_url text,
  bucket text,
  object_path text,
  visibility text not null default 'students',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint educational_resources_type_check check (resource_type in ('file', 'external_link')),
  constraint educational_resources_file_or_link_check check (
    (resource_type = 'file' and bucket is not null and object_path is not null)
    or (resource_type = 'external_link' and external_url is not null)
  ),
  constraint educational_resources_visibility_check check (visibility in ('students', 'students_and_guardians', 'private')),
  constraint educational_resources_status_check check (status in ('draft', 'published', 'archived'))
);

create index educational_resources_center_period_idx
  on public.educational_resources (center_id, academic_period_id, status, created_at desc);
create index educational_resources_assignment_idx
  on public.educational_resources (assignment_id, status);

create table public.classroom_tasks (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  assignment_id uuid not null references public.teacher_subject_assignments(id),
  title text not null,
  instructions text not null,
  due_at timestamptz not null,
  accepts_text boolean not null default true,
  accepts_files boolean not null default true,
  is_gradable boolean not null default false,
  max_score numeric(8,2),
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint classroom_tasks_submission_mode_check check (accepts_text = true or accepts_files = true),
  constraint classroom_tasks_score_check check (
    (is_gradable = true and max_score is not null and max_score > 0)
    or (is_gradable = false)
  ),
  constraint classroom_tasks_status_check check (status in ('draft', 'published', 'closed', 'archived'))
);

create index classroom_tasks_assignment_due_idx on public.classroom_tasks (assignment_id, due_at desc);
create index classroom_tasks_center_period_idx on public.classroom_tasks (center_id, academic_period_id, status);

create table public.classroom_task_attachments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  task_id uuid not null references public.classroom_tasks(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint classroom_task_attachments_size_check check (size_bytes > 0),
  constraint classroom_task_attachments_object_uidx unique (bucket, object_path)
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  task_id uuid not null references public.classroom_tasks(id) on delete cascade,
  student_id uuid not null references public.students(id),
  submitted_by uuid references public.profiles(id),
  submission_text text,
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  review_status text not null default 'pending',
  review_comment text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  score numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_submissions_review_status_check check (review_status in ('pending', 'reviewed', 'returned')),
  constraint task_submissions_score_check check (score is null or score >= 0)
);

create index task_submissions_task_student_submitted_idx
  on public.task_submissions (task_id, student_id, submitted_at desc);
create index task_submissions_center_student_submitted_idx
  on public.task_submissions (center_id, student_id, submitted_at desc);

create table public.task_submission_attachments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  submission_id uuid not null references public.task_submissions(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint task_submission_attachments_size_check check (size_bytes > 0),
  constraint task_submission_attachments_object_uidx unique (bucket, object_path)
);

-- ---------------------------------------------------------------------------
-- 9. Evaluations and academic results
-- ---------------------------------------------------------------------------

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
  assignment_id uuid not null references public.teacher_subject_assignments(id),
  created_by uuid not null references public.profiles(id),
  title text not null,
  evaluation_type text not null,
  evaluation_date date not null,
  max_score numeric(8,2) not null,
  status text not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint evaluations_max_score_check check (max_score > 0),
  constraint evaluations_status_check check (status in ('pending', 'applied', 'graded', 'published', 'expired'))
);

create index evaluations_assignment_date_idx on public.evaluations (assignment_id, evaluation_date desc);
create index evaluations_center_period_status_idx on public.evaluations (center_id, academic_period_id, status);

create table public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  student_id uuid not null references public.students(id),
  score numeric(8,2) not null,
  comment text,
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint evaluation_scores_score_check check (score >= 0),
  constraint evaluation_scores_evaluation_student_uidx unique (evaluation_id, student_id)
);

create index evaluation_scores_center_student_idx on public.evaluation_scores (center_id, student_id);

create table public.evaluation_score_audit_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  evaluation_score_id uuid not null references public.evaluation_scores(id) on delete cascade,
  old_score numeric(8,2),
  new_score numeric(8,2) not null,
  old_comment text,
  new_comment text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create index evaluation_score_audit_logs_score_idx
  on public.evaluation_score_audit_logs (evaluation_score_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- 10. Imports, reports and audit
-- ---------------------------------------------------------------------------

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  academic_period_id uuid references public.academic_periods(id) on delete set null,
  import_type text not null,
  status text not null default 'pending',
  file_name text,
  total_rows int not null default 0,
  success_rows int not null default 0,
  failed_rows int not null default 0,
  warning_rows int not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint import_jobs_type_check check (import_type in ('students_csv', 'asc_schedule')),
  constraint import_jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  constraint import_jobs_counts_check check (
    total_rows >= 0 and success_rows >= 0 and failed_rows >= 0 and warning_rows >= 0
  )
);

create index import_jobs_center_created_idx on public.import_jobs (center_id, created_at desc);

create table public.import_job_errors (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number int,
  severity text not null,
  code text not null,
  message text not null,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  constraint import_job_errors_severity_check check (severity in ('error', 'warning')),
  constraint import_job_errors_row_check check (row_number is null or row_number > 0)
);

create index import_job_errors_job_idx on public.import_job_errors (import_job_id, severity);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_center_created_idx on public.audit_logs (center_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers: timestamps, actor fields and validations
-- ---------------------------------------------------------------------------

create trigger centers_set_updated_at before update on public.centers
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger academic_periods_set_updated_at before update on public.academic_periods
  for each row execute function public.set_updated_at();
create trigger academic_periods_set_actor_fields before insert or update on public.academic_periods
  for each row execute function public.set_actor_fields();
create trigger sections_set_updated_at before update on public.sections
  for each row execute function public.set_updated_at();
create trigger sections_set_actor_fields before insert or update on public.sections
  for each row execute function public.set_actor_fields();
create trigger subgroups_set_updated_at before update on public.subgroups
  for each row execute function public.set_updated_at();
create trigger subgroups_set_actor_fields before insert or update on public.subgroups
  for each row execute function public.set_actor_fields();
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger subjects_set_actor_fields before insert or update on public.subjects
  for each row execute function public.set_actor_fields();
create trigger school_calendar_days_set_updated_at before update on public.school_calendar_days
  for each row execute function public.set_updated_at();
create trigger school_calendar_days_set_actor_fields before insert or update on public.school_calendar_days
  for each row execute function public.set_actor_fields();
create trigger teachers_set_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();
create trigger teachers_set_actor_fields before insert or update on public.teachers
  for each row execute function public.set_actor_fields();
create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger students_set_actor_fields before insert or update on public.students
  for each row execute function public.set_actor_fields();
create trigger teacher_subject_assignments_set_updated_at before update on public.teacher_subject_assignments
  for each row execute function public.set_updated_at();
create trigger teacher_subject_assignments_set_actor_fields before insert or update on public.teacher_subject_assignments
  for each row execute function public.set_actor_fields();
create trigger schedule_entries_set_updated_at before update on public.schedule_entries
  for each row execute function public.set_updated_at();
create trigger schedule_entries_set_actor_fields before insert or update on public.schedule_entries
  for each row execute function public.set_actor_fields();
create trigger activation_codes_set_updated_at before update on public.activation_codes
  for each row execute function public.set_updated_at();
create trigger activation_codes_set_actor_fields before insert or update on public.activation_codes
  for each row execute function public.set_actor_fields();
create trigger guardian_students_set_updated_at before update on public.guardian_students
  for each row execute function public.set_updated_at();
create trigger guardian_students_set_actor_fields before insert or update on public.guardian_students
  for each row execute function public.set_actor_fields();
create trigger student_qr_tokens_set_updated_at before update on public.student_qr_tokens
  for each row execute function public.set_updated_at();
create trigger student_qr_tokens_set_actor_fields before insert or update on public.student_qr_tokens
  for each row execute function public.set_actor_fields();
create trigger attendance_sessions_set_updated_at before update on public.attendance_sessions
  for each row execute function public.set_updated_at();
create trigger attendance_sessions_set_actor_fields before insert or update on public.attendance_sessions
  for each row execute function public.set_actor_fields();
create trigger attendance_records_set_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();
create trigger attendance_records_set_actor_fields before insert or update on public.attendance_records
  for each row execute function public.set_actor_fields();
create trigger absence_requests_set_updated_at before update on public.absence_requests
  for each row execute function public.set_updated_at();
create trigger absence_requests_set_actor_fields before insert or update on public.absence_requests
  for each row execute function public.set_actor_fields();
create trigger teacher_absences_set_updated_at before update on public.teacher_absences
  for each row execute function public.set_updated_at();
create trigger teacher_absences_set_actor_fields before insert or update on public.teacher_absences
  for each row execute function public.set_actor_fields();
create trigger messages_set_updated_at before update on public.messages
  for each row execute function public.set_updated_at();
create trigger messages_set_actor_fields before insert or update on public.messages
  for each row execute function public.set_actor_fields();
create trigger message_replies_set_updated_at before update on public.message_replies
  for each row execute function public.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute function public.set_updated_at();
create trigger educational_resources_set_updated_at before update on public.educational_resources
  for each row execute function public.set_updated_at();
create trigger educational_resources_set_actor_fields before insert or update on public.educational_resources
  for each row execute function public.set_actor_fields();
create trigger classroom_tasks_set_updated_at before update on public.classroom_tasks
  for each row execute function public.set_updated_at();
create trigger classroom_tasks_set_actor_fields before insert or update on public.classroom_tasks
  for each row execute function public.set_actor_fields();
create trigger task_submissions_set_updated_at before update on public.task_submissions
  for each row execute function public.set_updated_at();
create trigger evaluations_set_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();
create trigger evaluations_set_actor_fields before insert or update on public.evaluations
  for each row execute function public.set_actor_fields();
create trigger evaluation_scores_set_updated_at before update on public.evaluation_scores
  for each row execute function public.set_updated_at();

create or replace function public.ensure_guardian_student_link()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.guardian_students gs
    where gs.guardian_id = new.guardian_id
      and gs.student_id = new.student_id
      and gs.center_id = new.center_id
      and gs.status = 'active'
  ) then
    raise exception 'guardian % is not linked to student %', new.guardian_id, new.student_id;
  end if;

  return new;
end;
$$;

create trigger absence_requests_guardian_link_check
  before insert or update of guardian_id, student_id, center_id
  on public.absence_requests
  for each row execute function public.ensure_guardian_student_link();

create or replace function public.ensure_attendance_allowed()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.school_calendar_days scd
    where scd.center_id = new.center_id
      and scd.academic_period_id = new.academic_period_id
      and scd.date = new.attendance_date
      and scd.kind in ('holiday', 'closure')
  ) then
    raise exception 'attendance cannot be recorded on holiday or closure date %', new.attendance_date;
  end if;

  return new;
end;
$$;

create trigger attendance_sessions_calendar_check
  before insert or update of center_id, academic_period_id, attendance_date
  on public.attendance_sessions
  for each row execute function public.ensure_attendance_allowed();

create or replace function public.ensure_attendance_record_student_scope()
returns trigger
language plpgsql
as $$
declare
  session_assignment public.teacher_subject_assignments%rowtype;
  student_row public.students%rowtype;
begin
  select tsa.*
  into session_assignment
  from public.attendance_sessions ats
  join public.teacher_subject_assignments tsa on tsa.id = ats.assignment_id
  where ats.id = new.attendance_session_id;

  select *
  into student_row
  from public.students s
  where s.id = new.student_id;

  if session_assignment.id is null or student_row.id is null then
    raise exception 'attendance session or student not found';
  end if;

  if student_row.center_id <> new.center_id
    or session_assignment.center_id <> new.center_id
    or student_row.academic_period_id <> session_assignment.academic_period_id
    or student_row.section_id <> session_assignment.section_id
    or (
      session_assignment.subgroup_id is not null
      and student_row.subgroup_id is distinct from session_assignment.subgroup_id
    )
  then
    raise exception 'student does not belong to attendance assignment scope';
  end if;

  return new;
end;
$$;

create trigger attendance_records_student_scope_check
  before insert or update of center_id, attendance_session_id, student_id
  on public.attendance_records
  for each row execute function public.ensure_attendance_record_student_scope();

create or replace function public.set_task_submission_late()
returns trigger
language plpgsql
as $$
declare
  task_due_at timestamptz;
begin
  select due_at into task_due_at
  from public.classroom_tasks
  where id = new.task_id;

  if task_due_at is null then
    raise exception 'task not found for submission';
  end if;

  new.is_late = new.submitted_at > task_due_at;
  return new;
end;
$$;

create trigger task_submissions_late_check
  before insert or update of task_id, submitted_at
  on public.task_submissions
  for each row execute function public.set_task_submission_late();

create or replace function public.ensure_task_submission_score()
returns trigger
language plpgsql
as $$
declare
  task_max_score numeric(8,2);
begin
  if new.score is null then
    return new;
  end if;

  select max_score into task_max_score
  from public.classroom_tasks
  where id = new.task_id
    and is_gradable = true;

  if task_max_score is null then
    raise exception 'task is not gradable';
  end if;

  if new.score > task_max_score then
    raise exception 'submission score % exceeds max score %', new.score, task_max_score;
  end if;

  return new;
end;
$$;

create trigger task_submissions_score_check
  before insert or update of score, task_id
  on public.task_submissions
  for each row execute function public.ensure_task_submission_score();

create or replace function public.ensure_evaluation_score_max()
returns trigger
language plpgsql
as $$
declare
  max_allowed numeric(8,2);
begin
  select max_score into max_allowed
  from public.evaluations
  where id = new.evaluation_id;

  if max_allowed is null then
    raise exception 'evaluation not found';
  end if;

  if new.score > max_allowed then
    raise exception 'evaluation score % exceeds max score %', new.score, max_allowed;
  end if;

  return new;
end;
$$;

create trigger evaluation_scores_max_check
  before insert or update of score, evaluation_id
  on public.evaluation_scores
  for each row execute function public.ensure_evaluation_score_max();

create or replace function public.audit_evaluation_score_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.evaluation_score_audit_logs (
      center_id,
      evaluation_score_id,
      old_score,
      new_score,
      old_comment,
      new_comment,
      changed_by
    ) values (
      new.center_id,
      new.id,
      null,
      new.score,
      null,
      new.comment,
      new.recorded_by
    );
  elsif tg_op = 'UPDATE' and (
    old.score is distinct from new.score or old.comment is distinct from new.comment
  ) then
    insert into public.evaluation_score_audit_logs (
      center_id,
      evaluation_score_id,
      old_score,
      new_score,
      old_comment,
      new_comment,
      changed_by
    ) values (
      new.center_id,
      new.id,
      old.score,
      new.score,
      old.comment,
      new.comment,
      coalesce(auth.uid(), new.updated_by, new.recorded_by)
    );
  end if;

  return new;
end;
$$;

create trigger evaluation_scores_audit_change
  after insert or update of score, comment
  on public.evaluation_scores
  for each row execute function public.audit_evaluation_score_change();

-- ---------------------------------------------------------------------------
-- Security helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'
      and ur.is_active = true
  );
$$;

create or replace function public.has_center_role(p_center_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.center_id = p_center_id
        and ur.role = any(p_roles)
        and ur.is_active = true
    );
$$;

create or replace function public.can_access_center(p_center_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_center_role(
    p_center_id,
    array['center_admin', 'professor', 'student', 'guardian']
  );
$$;

create or replace function public.current_teacher_id(p_center_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teachers t
  where t.profile_id = auth.uid()
    and t.center_id = p_center_id
    and t.status = 'active'
  limit 1;
$$;

create or replace function public.current_student_id(p_center_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.profile_id = auth.uid()
    and s.center_id = p_center_id
    and s.status = 'active'
  limit 1;
$$;

create or replace function public.is_guardian_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardian_students gs
    where gs.guardian_id = auth.uid()
      and gs.student_id = p_student_id
      and gs.status = 'active'
  );
$$;

create or replace function public.is_student_profile(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.profile_id = auth.uid()
      and s.status = 'active'
  );
$$;

create or replace function public.is_assigned_teacher(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_subject_assignments tsa
    join public.teachers t on t.id = tsa.teacher_id
    where tsa.id = p_assignment_id
      and t.profile_id = auth.uid()
      and tsa.status = 'active'
      and t.status = 'active'
  );
$$;

create or replace function public.is_student_in_assignment(p_student_id uuid, p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.teacher_subject_assignments tsa on tsa.id = p_assignment_id
    where s.id = p_student_id
      and s.center_id = tsa.center_id
      and s.academic_period_id = tsa.academic_period_id
      and s.section_id = tsa.section_id
      and (
        tsa.subgroup_id is null
        or s.subgroup_id is not distinct from tsa.subgroup_id
      )
      and s.status = 'active'
      and tsa.status = 'active'
  );
$$;

create or replace function public.is_current_student_in_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and public.is_student_in_assignment(s.id, p_assignment_id)
  );
$$;

create or replace function public.is_guardian_for_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardian_students gs
    where gs.guardian_id = auth.uid()
      and gs.status = 'active'
      and public.is_student_in_assignment(gs.student_id, p_assignment_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

create or replace view public.active_user_context
with (security_invoker = true) as
select
  p.id as profile_id,
  p.email,
  p.mep_email,
  p.display_name,
  ur.center_id,
  c.name as center_name,
  ur.role,
  ur.is_active
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
left join public.centers c on c.id = ur.center_id
where p.status = 'active'
  and ur.is_active = true;

create or replace view public.current_student_presence
with (security_invoker = true) as
select distinct on (spe.student_id)
  spe.center_id,
  spe.student_id,
  s.full_name as student_name,
  spe.event_type,
  spe.event_at,
  spe.source,
  spe.registered_by
from public.student_presence_events spe
join public.students s on s.id = spe.student_id
order by spe.student_id, spe.event_at desc;

create or replace view public.guardian_student_summary
with (security_invoker = true) as
select
  gs.center_id,
  gs.guardian_id,
  gs.student_id,
  s.full_name as student_name,
  s.identification,
  s.academic_period_id,
  s.section_id,
  sec.name as section_name,
  s.subgroup_id,
  sg.name as subgroup_name,
  gs.status,
  gs.linked_via,
  gs.consent_accepted_at
from public.guardian_students gs
join public.students s on s.id = gs.student_id
join public.sections sec on sec.id = s.section_id
left join public.subgroups sg on sg.id = s.subgroup_id;

create or replace view public.teacher_schedule_view
with (security_invoker = true) as
select
  se.id as schedule_entry_id,
  se.center_id,
  se.academic_period_id,
  se.day_of_week,
  se.period_number,
  se.starts_at,
  se.ends_at,
  se.room,
  tsa.id as assignment_id,
  t.id as teacher_id,
  t.profile_id as teacher_profile_id,
  t.full_name as teacher_name,
  sub.id as subject_id,
  sub.name as subject_name,
  sec.id as section_id,
  sec.name as section_name,
  sg.id as subgroup_id,
  sg.name as subgroup_name,
  se.status
from public.schedule_entries se
join public.teacher_subject_assignments tsa on tsa.id = se.assignment_id
join public.teachers t on t.id = tsa.teacher_id
join public.subjects sub on sub.id = tsa.subject_id
join public.sections sec on sec.id = tsa.section_id
left join public.subgroups sg on sg.id = tsa.subgroup_id;

create or replace view public.attendance_summary_by_student
with (security_invoker = true) as
select
  ar.center_id,
  ar.student_id,
  ats.academic_period_id,
  tsa.subject_id,
  count(*) as total_records,
  count(*) filter (where ar.status = 'present') as present_count,
  count(*) filter (where ar.status = 'absent') as absent_count,
  count(*) filter (where ar.status = 'justified') as justified_count,
  count(*) filter (where ar.status = 'late') as late_count,
  round(
    (count(*) filter (where ar.status in ('present', 'justified'))::numeric
      / nullif(count(*), 0)) * 100,
    2
  ) as attendance_percentage
from public.attendance_records ar
join public.attendance_sessions ats on ats.id = ar.attendance_session_id
join public.teacher_subject_assignments tsa on tsa.id = ats.assignment_id
group by ar.center_id, ar.student_id, ats.academic_period_id, tsa.subject_id;

create or replace view public.admin_attendance_dashboard
with (security_invoker = true) as
select
  ats.center_id,
  ats.academic_period_id,
  ats.attendance_date,
  count(distinct ats.id) as sessions_count,
  count(ar.id) as records_count,
  count(ar.id) filter (where ar.status = 'present') as present_count,
  count(ar.id) filter (where ar.status = 'absent') as absent_count,
  count(ar.id) filter (where ar.status = 'justified') as justified_count,
  round(
    (count(ar.id) filter (where ar.status in ('present', 'justified'))::numeric
      / nullif(count(ar.id), 0)) * 100,
    2
  ) as attendance_percentage
from public.attendance_sessions ats
left join public.attendance_records ar on ar.attendance_session_id = ats.id
group by ats.center_id, ats.academic_period_id, ats.attendance_date;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.validate_activation_code(
  p_center_id uuid,
  p_code_hash text
)
returns table (
  activation_code_id uuid,
  purpose text,
  role text,
  academic_period_id uuid,
  metadata jsonb,
  student_ids uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.activation_codes%rowtype;
begin
  select *
  into code_row
  from public.activation_codes
  where center_id = p_center_id
    and code_hash = p_code_hash;

  if code_row.id is null then
    raise exception 'activation code not found';
  end if;

  if code_row.status <> 'active' or code_row.expires_at <= now() then
    raise exception 'activation code is not active';
  end if;

  return query
  select
    code_row.id,
    code_row.purpose,
    code_row.role,
    code_row.academic_period_id,
    code_row.metadata,
    coalesce(
      array_agg(acs.student_id) filter (where acs.student_id is not null),
      array[]::uuid[]
    )
  from public.activation_codes ac
  left join public.activation_code_students acs on acs.activation_code_id = ac.id
  where ac.id = code_row.id
  group by ac.id;
end;
$$;

create or replace function public.consume_activation_code(
  p_center_id uuid,
  p_code_hash text,
  p_consumed_by uuid default auth.uid()
)
returns table (
  activation_code_id uuid,
  purpose text,
  role text,
  academic_period_id uuid,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.activation_codes%rowtype;
begin
  select *
  into code_row
  from public.activation_codes
  where center_id = p_center_id
    and code_hash = p_code_hash
  for update;

  if code_row.id is null then
    raise exception 'activation code not found';
  end if;

  if code_row.status <> 'active' or code_row.expires_at <= now() then
    update public.activation_codes
    set status = case when expires_at <= now() then 'expired' else status end,
        updated_at = now()
    where id = code_row.id;
    raise exception 'activation code is not active';
  end if;

  update public.activation_codes
  set status = 'consumed',
      consumed_at = now(),
      consumed_by = p_consumed_by,
      updated_at = now(),
      updated_by = p_consumed_by
  where id = code_row.id;

  return query
  select code_row.id, code_row.purpose, code_row.role, code_row.academic_period_id, code_row.metadata;
end;
$$;

create or replace function public.link_guardian_students(
  p_activation_code_id uuid,
  p_guardian_id uuid default auth.uid(),
  p_consent_version text default 'v1'
)
returns setof public.guardian_students
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.activation_codes%rowtype;
begin
  select *
  into code_row
  from public.activation_codes
  where id = p_activation_code_id
    and purpose in ('guardian_link', 'registration')
    and status = 'consumed';

  if code_row.id is null then
    raise exception 'consumed guardian activation code not found';
  end if;

  insert into public.guardian_students (
    center_id,
    guardian_id,
    student_id,
    linked_via,
    consent_accepted_at,
    consent_version,
    created_by
  )
  select
    acs.center_id,
    p_guardian_id,
    acs.student_id,
    case when code_row.purpose = 'registration' then 'registration_code' else 'additional_code' end,
    now(),
    p_consent_version,
    p_guardian_id
  from public.activation_code_students acs
  where acs.activation_code_id = p_activation_code_id
  on conflict (guardian_id, student_id)
  do update set
    status = 'active',
    updated_at = now(),
    updated_by = p_guardian_id
  where public.guardian_students.status <> 'active';

  return query
  select *
  from public.guardian_students gs
  where gs.guardian_id = p_guardian_id
    and gs.center_id = code_row.center_id
    and exists (
      select 1
      from public.activation_code_students acs
      where acs.activation_code_id = p_activation_code_id
        and acs.student_id = gs.student_id
    );
end;
$$;

create or replace function public.record_attendance_session(
  p_schedule_entry_id uuid,
  p_attendance_date date,
  p_records jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule_row public.schedule_entries%rowtype;
  session_id uuid;
  record_item jsonb;
begin
  select *
  into schedule_row
  from public.schedule_entries
  where id = p_schedule_entry_id
    and status = 'active';

  if schedule_row.id is null then
    raise exception 'schedule entry not found';
  end if;

  if not public.is_assigned_teacher(schedule_row.assignment_id)
     and not public.has_center_role(schedule_row.center_id, array['center_admin']) then
    raise exception 'not allowed to record attendance for this schedule';
  end if;

  insert into public.attendance_sessions (
    center_id,
    academic_period_id,
    schedule_entry_id,
    assignment_id,
    attendance_date,
    taken_by,
    created_by
  ) values (
    schedule_row.center_id,
    schedule_row.academic_period_id,
    schedule_row.id,
    schedule_row.assignment_id,
    p_attendance_date,
    auth.uid(),
    auth.uid()
  )
  on conflict (schedule_entry_id, attendance_date)
  do update set
    taken_by = auth.uid(),
    taken_at = now(),
    status = 'submitted',
    updated_at = now(),
    updated_by = auth.uid()
  returning id into session_id;

  for record_item in select * from jsonb_array_elements(p_records)
  loop
    insert into public.attendance_records (
      center_id,
      attendance_session_id,
      student_id,
      status,
      notes,
      created_by,
      updated_by
    ) values (
      schedule_row.center_id,
      session_id,
      (record_item->>'student_id')::uuid,
      record_item->>'status',
      nullif(record_item->>'notes', ''),
      auth.uid(),
      auth.uid()
    )
    on conflict (attendance_session_id, student_id)
    do update set
      status = excluded.status,
      notes = excluded.notes,
      updated_at = now(),
      updated_by = auth.uid();
  end loop;

  return session_id;
end;
$$;

create or replace function public.update_attendance_record_same_day(
  p_attendance_record_id uuid,
  p_new_status text,
  p_reason text
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  record_row public.attendance_records%rowtype;
  session_row public.attendance_sessions%rowtype;
  previous_status text;
begin
  select * into record_row
  from public.attendance_records
  where id = p_attendance_record_id
  for update;

  if record_row.id is null then
    raise exception 'attendance record not found';
  end if;

  select * into session_row
  from public.attendance_sessions
  where id = record_row.attendance_session_id;

  if session_row.attendance_date <> current_date then
    raise exception 'attendance can only be edited on the same day';
  end if;

  if not public.is_assigned_teacher(session_row.assignment_id) then
    raise exception 'only assigned professor can edit attendance';
  end if;

  if p_new_status not in ('present', 'absent', 'justified', 'late') then
    raise exception 'invalid attendance status';
  end if;

  previous_status = record_row.status;

  update public.attendance_records
  set status = p_new_status,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_attendance_record_id
  returning * into record_row;

  insert into public.attendance_change_logs (
    center_id,
    attendance_record_id,
    old_status,
    new_status,
    reason,
    changed_by
  ) values (
    record_row.center_id,
    record_row.id,
    previous_status,
    p_new_status,
    p_reason,
    auth.uid()
  );

  return record_row;
end;
$$;

create or replace function public.create_absence_request(
  p_student_id uuid,
  p_request_type text,
  p_reason text,
  p_starts_on date,
  p_ends_on date,
  p_schedule_entry_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students%rowtype;
  request_id uuid;
  schedule_id uuid;
begin
  select * into student_row
  from public.students
  where id = p_student_id;

  if student_row.id is null then
    raise exception 'student not found';
  end if;

  if not public.is_guardian_of_student(p_student_id) then
    raise exception 'guardian is not linked to student';
  end if;

  insert into public.absence_requests (
    center_id,
    student_id,
    guardian_id,
    request_type,
    reason,
    starts_on,
    ends_on,
    created_by,
    updated_by
  ) values (
    student_row.center_id,
    p_student_id,
    auth.uid(),
    p_request_type,
    p_reason,
    p_starts_on,
    p_ends_on,
    auth.uid(),
    auth.uid()
  )
  returning id into request_id;

  foreach schedule_id in array p_schedule_entry_ids
  loop
    insert into public.absence_request_schedule_entries (
      absence_request_id,
      schedule_entry_id,
      center_id
    ) values (
      request_id,
      schedule_id,
      student_row.center_id
    );
  end loop;

  return request_id;
end;
$$;

create or replace function public.record_evaluation_scores(
  p_evaluation_id uuid,
  p_scores jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  evaluation_row public.evaluations%rowtype;
  score_item jsonb;
begin
  select * into evaluation_row
  from public.evaluations
  where id = p_evaluation_id;

  if evaluation_row.id is null then
    raise exception 'evaluation not found';
  end if;

  if not public.is_assigned_teacher(evaluation_row.assignment_id) then
    raise exception 'not allowed to record scores for this evaluation';
  end if;

  for score_item in select * from jsonb_array_elements(p_scores)
  loop
    insert into public.evaluation_scores (
      center_id,
      evaluation_id,
      student_id,
      score,
      comment,
      recorded_by,
      updated_by
    ) values (
      evaluation_row.center_id,
      evaluation_row.id,
      (score_item->>'student_id')::uuid,
      (score_item->>'score')::numeric,
      nullif(score_item->>'comment', ''),
      auth.uid(),
      auth.uid()
    )
    on conflict (evaluation_id, student_id)
    do update set
      score = excluded.score,
      comment = excluded.comment,
      updated_at = now(),
      updated_by = auth.uid();
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.centers enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_periods enable row level security;
alter table public.sections enable row level security;
alter table public.subgroups enable row level security;
alter table public.subjects enable row level security;
alter table public.school_calendar_days enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.teacher_subject_assignments enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.activation_codes enable row level security;
alter table public.activation_code_students enable row level security;
alter table public.guardian_students enable row level security;
alter table public.student_qr_tokens enable row level security;
alter table public.student_presence_events enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_change_logs enable row level security;
alter table public.absence_requests enable row level security;
alter table public.absence_request_schedule_entries enable row level security;
alter table public.absence_request_attachments enable row level security;
alter table public.teacher_absences enable row level security;
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;
alter table public.message_replies enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.educational_resources enable row level security;
alter table public.classroom_tasks enable row level security;
alter table public.classroom_task_attachments enable row level security;
alter table public.task_submissions enable row level security;
alter table public.task_submission_attachments enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.evaluation_score_audit_logs enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_job_errors enable row level security;
alter table public.audit_logs enable row level security;

create policy centers_select_visible
  on public.centers for select
  using (public.is_super_admin() or public.can_access_center(id));
create policy centers_manage_super_admin
  on public.centers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy profiles_select_visible
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = profiles.id
        and ur.center_id is not null
        and public.has_center_role(ur.center_id, array['center_admin'])
    )
  );
create policy profiles_update_self
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy user_roles_select_visible
  on public.user_roles for select
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or (center_id is not null and public.has_center_role(center_id, array['center_admin']))
  );
create policy user_roles_manage_admin
  on public.user_roles for all
  using (public.is_super_admin() or public.has_center_role(center_id, array['center_admin']))
  with check (public.is_super_admin() or public.has_center_role(center_id, array['center_admin']));

-- Center-scoped master data: readable by center members, mutable by center admins.
create policy academic_periods_select_center
  on public.academic_periods for select using (public.can_access_center(center_id));
create policy academic_periods_manage_admin
  on public.academic_periods for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy sections_select_center
  on public.sections for select using (public.can_access_center(center_id));
create policy sections_manage_admin
  on public.sections for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy subgroups_select_center
  on public.subgroups for select using (public.can_access_center(center_id));
create policy subgroups_manage_admin
  on public.subgroups for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy subjects_select_center
  on public.subjects for select using (public.can_access_center(center_id));
create policy subjects_manage_admin
  on public.subjects for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy calendar_select_center
  on public.school_calendar_days for select using (public.can_access_center(center_id));
create policy calendar_manage_admin
  on public.school_calendar_days for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy teachers_select_center
  on public.teachers for select using (public.can_access_center(center_id));
create policy teachers_manage_admin
  on public.teachers for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy students_select_scoped
  on public.students for select
  using (
    public.has_center_role(center_id, array['center_admin', 'professor'])
    or profile_id = auth.uid()
    or public.is_guardian_of_student(id)
  );
create policy students_manage_admin
  on public.students for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy assignments_select_center
  on public.teacher_subject_assignments for select using (public.can_access_center(center_id));
create policy assignments_manage_admin
  on public.teacher_subject_assignments for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy schedule_select_center
  on public.schedule_entries for select using (public.can_access_center(center_id));
create policy schedule_manage_admin
  on public.schedule_entries for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy activation_codes_admin_only
  on public.activation_codes for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));
create policy activation_code_students_admin_only
  on public.activation_code_students for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy guardian_students_select_scoped
  on public.guardian_students for select
  using (
    guardian_id = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
  );
create policy guardian_students_manage_admin
  on public.guardian_students for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy qr_tokens_admin_only
  on public.student_qr_tokens for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));
create policy presence_select_scoped
  on public.student_presence_events for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_student_profile(student_id)
    or public.is_guardian_of_student(student_id)
  );
create policy presence_insert_admin
  on public.student_presence_events for insert
  with check (public.has_center_role(center_id, array['center_admin']));

create policy attendance_sessions_select_scoped
  on public.attendance_sessions for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_assigned_teacher(assignment_id)
    or exists (
      select 1
      from public.attendance_records ar
      where ar.attendance_session_id = attendance_sessions.id
        and (public.is_student_profile(ar.student_id) or public.is_guardian_of_student(ar.student_id))
    )
  );
create policy attendance_sessions_insert_teacher
  on public.attendance_sessions for insert
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_assigned_teacher(assignment_id)
  );
create policy attendance_sessions_update_teacher
  on public.attendance_sessions for update
  using (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_assigned_teacher(assignment_id)
  )
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_assigned_teacher(assignment_id)
  );

create policy attendance_records_select_scoped
  on public.attendance_records for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_student_profile(student_id)
    or public.is_guardian_of_student(student_id)
    or exists (
      select 1
      from public.attendance_sessions ats
      where ats.id = attendance_records.attendance_session_id
        and public.is_assigned_teacher(ats.assignment_id)
    )
  );
create policy attendance_records_teacher_write
  on public.attendance_records for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1
      from public.attendance_sessions ats
      where ats.id = attendance_records.attendance_session_id
        and public.is_assigned_teacher(ats.assignment_id)
    )
  )
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1
      from public.attendance_sessions ats
      where ats.id = attendance_records.attendance_session_id
        and public.is_assigned_teacher(ats.assignment_id)
    )
  );

create policy attendance_change_logs_select_scoped
  on public.attendance_change_logs for select
  using (public.has_center_role(center_id, array['center_admin', 'professor']));
create policy attendance_change_logs_insert_teacher
  on public.attendance_change_logs for insert
  with check (public.has_center_role(center_id, array['center_admin', 'professor']));

create policy absence_requests_select_scoped
  on public.absence_requests for select
  using (
    guardian_id = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1
      from public.absence_request_schedule_entries arse
      join public.schedule_entries se on se.id = arse.schedule_entry_id
      where arse.absence_request_id = absence_requests.id
        and public.is_assigned_teacher(se.assignment_id)
    )
  );
create policy absence_requests_guardian_insert
  on public.absence_requests for insert
  with check (guardian_id = auth.uid() and public.is_guardian_of_student(student_id));
create policy absence_requests_professor_or_admin_update
  on public.absence_requests for update
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1
      from public.absence_request_schedule_entries arse
      join public.schedule_entries se on se.id = arse.schedule_entry_id
      where arse.absence_request_id = absence_requests.id
        and public.is_assigned_teacher(se.assignment_id)
    )
  )
  with check (public.can_access_center(center_id));

create policy absence_request_schedule_entries_select_scoped
  on public.absence_request_schedule_entries for select
  using (public.can_access_center(center_id));
create policy absence_request_schedule_entries_write_scoped
  on public.absence_request_schedule_entries for all
  using (public.can_access_center(center_id))
  with check (public.can_access_center(center_id));

create policy absence_request_attachments_select_scoped
  on public.absence_request_attachments for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.absence_requests ar
      where ar.id = absence_request_attachments.absence_request_id
        and ar.guardian_id = auth.uid()
    )
  );
create policy absence_request_attachments_insert_guardian
  on public.absence_request_attachments for insert
  with check (uploaded_by = auth.uid());

create policy teacher_absences_select_center
  on public.teacher_absences for select using (public.can_access_center(center_id));
create policy teacher_absences_manage_professor_or_admin
  on public.teacher_absences for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.teachers t
      where t.id = teacher_absences.teacher_id
        and t.profile_id = auth.uid()
    )
  )
  with check (public.can_access_center(center_id));

create policy messages_select_visible
  on public.messages for select
  using (
    sender_id = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.message_recipients mr
      where mr.message_id = messages.id
        and mr.recipient_id = auth.uid()
    )
  );
create policy messages_insert_center_member
  on public.messages for insert
  with check (sender_id = auth.uid() and public.can_access_center(center_id));

create policy message_recipients_select_visible
  on public.message_recipients for select
  using (
    recipient_id = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.messages m
      where m.id = message_recipients.message_id
        and m.sender_id = auth.uid()
    )
  );
create policy message_recipients_insert_sender_or_admin
  on public.message_recipients for insert
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.messages m
      where m.id = message_recipients.message_id
        and m.sender_id = auth.uid()
    )
  );
create policy message_recipients_update_own_read
  on public.message_recipients for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy message_replies_select_visible
  on public.message_replies for select
  using (
    sender_id = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.message_recipients mr
      where mr.message_id = message_replies.message_id
        and mr.recipient_id = auth.uid()
    )
  );
create policy message_replies_insert_visible_participant
  on public.message_replies for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from public.messages m
        where m.id = message_replies.message_id
          and m.sender_id = auth.uid()
      )
      or exists (
        select 1 from public.message_recipients mr
        where mr.message_id = message_replies.message_id
          and mr.recipient_id = auth.uid()
      )
    )
  );

create policy notifications_select_own
  on public.notifications for select
  using (recipient_id = auth.uid() or public.has_center_role(center_id, array['center_admin']));
create policy notifications_update_own_read
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy notifications_insert_server_or_admin
  on public.notifications for insert
  with check (public.has_center_role(center_id, array['center_admin']));

create policy push_tokens_select_own
  on public.push_tokens for select using (profile_id = auth.uid());
create policy push_tokens_manage_own
  on public.push_tokens for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy resources_select_scoped
  on public.educational_resources for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or author_id = auth.uid()
    or (status = 'published' and assignment_id is not null and (
      public.is_assigned_teacher(assignment_id)
      or public.is_current_student_in_assignment(assignment_id)
      or (visibility = 'students_and_guardians' and public.is_guardian_for_assignment(assignment_id))
    ))
  );
create policy resources_teacher_write
  on public.educational_resources for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or author_id = auth.uid()
  )
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or (author_id = auth.uid() and (assignment_id is null or public.is_assigned_teacher(assignment_id)))
  );

create policy classroom_tasks_select_scoped
  on public.classroom_tasks for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or author_id = auth.uid()
    or public.is_assigned_teacher(assignment_id)
    or public.is_current_student_in_assignment(assignment_id)
    or public.is_guardian_for_assignment(assignment_id)
  );
create policy classroom_tasks_teacher_write
  on public.classroom_tasks for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or author_id = auth.uid()
  )
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or (author_id = auth.uid() and public.is_assigned_teacher(assignment_id))
  );

create policy classroom_task_attachments_select_scoped
  on public.classroom_task_attachments for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.classroom_tasks ct
      where ct.id = classroom_task_attachments.task_id
        and (
          ct.author_id = auth.uid()
          or public.is_current_student_in_assignment(ct.assignment_id)
          or public.is_guardian_for_assignment(ct.assignment_id)
        )
    )
  );
create policy classroom_task_attachments_write_teacher
  on public.classroom_task_attachments for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.classroom_tasks ct
      where ct.id = classroom_task_attachments.task_id
        and ct.author_id = auth.uid()
    )
  );

create policy task_submissions_select_scoped
  on public.task_submissions for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or submitted_by = auth.uid()
    or public.is_student_profile(student_id)
    or public.is_guardian_of_student(student_id)
    or exists (
      select 1 from public.classroom_tasks ct
      where ct.id = task_submissions.task_id
        and public.is_assigned_teacher(ct.assignment_id)
    )
  );
create policy task_submissions_student_insert
  on public.task_submissions for insert
  with check (
    (submitted_by = auth.uid() or public.is_student_profile(student_id))
    and exists (
      select 1 from public.classroom_tasks ct
      where ct.id = task_submissions.task_id
        and public.is_student_in_assignment(student_id, ct.assignment_id)
    )
  );
create policy task_submissions_teacher_review
  on public.task_submissions for update
  using (
    exists (
      select 1 from public.classroom_tasks ct
      where ct.id = task_submissions.task_id
        and public.is_assigned_teacher(ct.assignment_id)
    )
  )
  with check (public.can_access_center(center_id));

create policy task_submission_attachments_select_scoped
  on public.task_submission_attachments for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.task_submissions ts
      where ts.id = task_submission_attachments.submission_id
        and (
          ts.submitted_by = auth.uid()
          or public.is_student_profile(ts.student_id)
          or public.is_guardian_of_student(ts.student_id)
        )
    )
    or exists (
      select 1
      from public.task_submissions ts
      join public.classroom_tasks ct on ct.id = ts.task_id
      where ts.id = task_submission_attachments.submission_id
        and public.is_assigned_teacher(ct.assignment_id)
    )
  );
create policy task_submission_attachments_insert_student
  on public.task_submission_attachments for insert
  with check (
    exists (
      select 1 from public.task_submissions ts
      where ts.id = task_submission_attachments.submission_id
        and (ts.submitted_by = auth.uid() or public.is_student_profile(ts.student_id))
    )
  );

create policy evaluations_select_scoped
  on public.evaluations for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or created_by = auth.uid()
    or public.is_assigned_teacher(assignment_id)
    or (
      status = 'published'
      and (
        public.is_current_student_in_assignment(assignment_id)
        or public.is_guardian_for_assignment(assignment_id)
      )
    )
  );
create policy evaluations_teacher_write
  on public.evaluations for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or created_by = auth.uid()
  )
  with check (
    public.has_center_role(center_id, array['center_admin'])
    or (created_by = auth.uid() and public.is_assigned_teacher(assignment_id))
  );

create policy evaluation_scores_select_scoped
  on public.evaluation_scores for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or public.is_student_profile(student_id)
    or public.is_guardian_of_student(student_id)
    or exists (
      select 1 from public.evaluations e
      where e.id = evaluation_scores.evaluation_id
        and public.is_assigned_teacher(e.assignment_id)
    )
  );
create policy evaluation_scores_teacher_write
  on public.evaluation_scores for all
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.evaluations e
      where e.id = evaluation_scores.evaluation_id
        and public.is_assigned_teacher(e.assignment_id)
    )
  )
  with check (public.can_access_center(center_id));

create policy evaluation_score_audit_logs_select_scoped
  on public.evaluation_score_audit_logs for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1 from public.evaluation_scores es
      join public.evaluations e on e.id = es.evaluation_id
      where es.id = evaluation_score_audit_logs.evaluation_score_id
        and public.is_assigned_teacher(e.assignment_id)
    )
  );

create policy import_jobs_admin_only
  on public.import_jobs for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));
create policy import_job_errors_admin_only
  on public.import_job_errors for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy audit_logs_select_admin
  on public.audit_logs for select
  using (public.is_super_admin() or (center_id is not null and public.has_center_role(center_id, array['center_admin'])));
create policy audit_logs_insert_center_member
  on public.audit_logs for insert
  with check (actor_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('absence-attachments', 'absence-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('educational-resources', 'educational-resources', false, 52428800, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/webp']),
  ('classroom-task-files', 'classroom-task-files', false, 52428800, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp']),
  ('classroom-submissions', 'classroom-submissions', false, 52428800, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']),
  ('profile-media', 'profile-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_center_read
  on storage.objects for select
  using (
    bucket_id in ('absence-attachments', 'educational-resources', 'classroom-task-files', 'classroom-submissions', 'profile-media')
    and (
      owner = auth.uid()
      or public.can_access_center(split_part(name, '/', 1)::uuid)
    )
  );

create policy storage_center_insert
  on storage.objects for insert
  with check (
    bucket_id in ('absence-attachments', 'educational-resources', 'classroom-task-files', 'classroom-submissions', 'profile-media')
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin', 'professor'])
    )
  );

create policy storage_owner_or_admin_update
  on storage.objects for update
  using (
    bucket_id in ('absence-attachments', 'educational-resources', 'classroom-task-files', 'classroom-submissions', 'profile-media')
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  )
  with check (
    bucket_id in ('absence-attachments', 'educational-resources', 'classroom-task-files', 'classroom-submissions', 'profile-media')
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  );

create policy storage_owner_or_admin_delete
  on storage.objects for delete
  using (
    bucket_id in ('absence-attachments', 'educational-resources', 'classroom-task-files', 'classroom-submissions', 'profile-media')
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
    alter publication supabase_realtime add table public.attendance_sessions;
    alter publication supabase_realtime add table public.attendance_records;
    alter publication supabase_realtime add table public.student_presence_events;
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.message_recipients;
  end if;
exception
  when duplicate_object then
    null;
end;
$$;

-- ---------------------------------------------------------------------------
-- API privileges. RLS remains the enforcement layer for authenticated users.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
grant execute on function public.validate_activation_code(uuid, text) to anon;

commit;
