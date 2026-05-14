-- Edu360 supplemental Supabase/PostgreSQL schema.
-- This migration complements 20260514000100_initial_schema.sql after the first
-- production migration has already been applied.

begin;

-- ---------------------------------------------------------------------------
-- 1. Center-level product configuration
-- ---------------------------------------------------------------------------

create table public.center_settings (
  center_id uuid primary key references public.centers(id) on delete cascade,
  attendance_threshold_percent numeric(5,2) not null default 80.00,
  unattended_class_alert_minutes int not null default 15,
  qr_token_ttl_minutes int not null default 10,
  notify_entry_enabled boolean not null default true,
  notify_exit_enabled boolean not null default true,
  allowed_professor_email_domains text[] not null default array['mep.go.cr']::text[],
  allowed_student_email_domains text[] not null default array['est.mep.go.cr']::text[],
  allowed_guardian_email_domains text[] not null default array['est.mep.go.cr']::text[],
  password_min_length int not null default 8,
  privacy_notice_version text not null default 'v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint center_settings_attendance_threshold_check check (
    attendance_threshold_percent > 0 and attendance_threshold_percent <= 100
  ),
  constraint center_settings_unattended_minutes_check check (
    unattended_class_alert_minutes between 1 and 240
  ),
  constraint center_settings_qr_ttl_check check (qr_token_ttl_minutes between 1 and 1440),
  constraint center_settings_password_min_check check (password_min_length between 6 and 128)
);

create trigger center_settings_set_updated_at before update on public.center_settings
  for each row execute function public.set_updated_at();
create trigger center_settings_set_actor_fields before insert or update on public.center_settings
  for each row execute function public.set_actor_fields();

-- ---------------------------------------------------------------------------
-- 2. Notifications, alerting and delivery tracking
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists priority text not null default 'normal',
  add column if not exists action_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  add constraint notifications_priority_check
  check (priority in ('low', 'normal', 'high', 'critical'));

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_event_type_check check (
    event_type in (
      'presence_entry',
      'presence_exit',
      'absence_request_created',
      'absence_request_resolved',
      'task_created',
      'task_reviewed',
      'evaluation_published',
      'attendance_not_recorded',
      'critical_absenteeism',
      'message_received',
      'system'
    )
  ),
  constraint notification_preferences_profile_event_uidx unique (center_id, profile_id, event_type)
);

create index notification_preferences_profile_idx
  on public.notification_preferences (profile_id, center_id);

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null,
  status text not null default 'queued',
  attempt_count int not null default 0,
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_channel_check check (channel in ('in_app', 'push', 'email')),
  constraint notification_deliveries_status_check check (
    status in ('queued', 'sending', 'sent', 'failed', 'skipped')
  ),
  constraint notification_deliveries_attempt_count_check check (attempt_count >= 0),
  constraint notification_deliveries_notification_channel_uidx unique (notification_id, channel)
);

create index notification_deliveries_center_status_idx
  on public.notification_deliveries (center_id, status, created_at desc);
create index notification_deliveries_notification_idx
  on public.notification_deliveries (notification_id);

create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

create or replace function public.enqueue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_channel text;
begin
  foreach delivery_channel in array new.delivery_channels
  loop
    if delivery_channel in ('in_app', 'push', 'email') then
      insert into public.notification_deliveries (
        center_id,
        notification_id,
        channel,
        status
      ) values (
        new.center_id,
        new.id,
        delivery_channel,
        case when delivery_channel = 'in_app' then 'sent' else 'queued' end
      )
      on conflict (notification_id, channel) do nothing;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists notifications_enqueue_deliveries on public.notifications;
create trigger notifications_enqueue_deliveries
  after insert on public.notifications
  for each row execute function public.enqueue_notification_deliveries();

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default true,
  threshold_percent numeric(5,2),
  delay_minutes int,
  dedupe_window_hours int not null default 24,
  delivery_channels text[] not null default array['in_app', 'push']::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint alert_rules_type_check check (
    rule_type in ('critical_absenteeism', 'attendance_not_recorded')
  ),
  constraint alert_rules_threshold_check check (
    threshold_percent is null or (threshold_percent > 0 and threshold_percent <= 100)
  ),
  constraint alert_rules_delay_check check (delay_minutes is null or delay_minutes between 1 and 240),
  constraint alert_rules_dedupe_check check (dedupe_window_hours between 1 and 720),
  constraint alert_rules_center_type_uidx unique (center_id, rule_type)
);

create index alert_rules_center_enabled_idx
  on public.alert_rules (center_id, enabled, rule_type);

create trigger alert_rules_set_updated_at before update on public.alert_rules
  for each row execute function public.set_updated_at();
create trigger alert_rules_set_actor_fields before insert or update on public.alert_rules
  for each row execute function public.set_actor_fields();

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  event_type text not null,
  severity text not null default 'warning',
  status text not null default 'open',
  fingerprint text not null,
  student_id uuid references public.students(id) on delete cascade,
  assignment_id uuid references public.teacher_subject_assignments(id) on delete set null,
  schedule_entry_id uuid references public.schedule_entries(id) on delete set null,
  attendance_session_id uuid references public.attendance_sessions(id) on delete set null,
  notification_id uuid references public.notifications(id) on delete set null,
  title text not null,
  body text not null,
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_events_event_type_check check (
    event_type in ('critical_absenteeism', 'attendance_not_recorded')
  ),
  constraint alert_events_severity_check check (severity in ('info', 'warning', 'critical')),
  constraint alert_events_status_check check (
    status in ('open', 'acknowledged', 'resolved', 'suppressed')
  ),
  constraint alert_events_center_event_fingerprint_uidx unique (center_id, event_type, fingerprint)
);

create index alert_events_center_status_idx
  on public.alert_events (center_id, status, detected_at desc);
create index alert_events_student_idx
  on public.alert_events (student_id, detected_at desc)
  where student_id is not null;
create index alert_events_schedule_idx
  on public.alert_events (schedule_entry_id, detected_at desc)
  where schedule_entry_id is not null;

create trigger alert_events_set_updated_at before update on public.alert_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Report/export jobs and import preview rows
-- ---------------------------------------------------------------------------

create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  report_type text not null,
  format text not null,
  status text not null default 'queued',
  filters jsonb not null default '{}'::jsonb,
  bucket text,
  object_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_exports_type_check check (
    report_type in (
      'attendance_student',
      'attendance_section',
      'attendance_subject',
      'evaluation_results',
      'guardian_summary',
      'operations_dashboard'
    )
  ),
  constraint report_exports_format_check check (format in ('pdf', 'xlsx', 'csv')),
  constraint report_exports_status_check check (
    status in ('queued', 'processing', 'completed', 'failed', 'expired')
  ),
  constraint report_exports_file_when_completed_check check (
    status <> 'completed'
    or (bucket is not null and object_path is not null and file_name is not null)
  ),
  constraint report_exports_size_check check (size_bytes is null or size_bytes > 0)
);

create index report_exports_center_created_idx
  on public.report_exports (center_id, created_at desc);
create index report_exports_requested_by_idx
  on public.report_exports (requested_by, created_at desc);
create index report_exports_status_idx
  on public.report_exports (status, created_at);

create trigger report_exports_set_updated_at before update on public.report_exports
  for each row execute function public.set_updated_at();

create table public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number int not null,
  operation text not null default 'insert',
  status text not null default 'pending',
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_job_rows_number_check check (row_number > 0),
  constraint import_job_rows_operation_check check (operation in ('insert', 'update', 'skip', 'error')),
  constraint import_job_rows_status_check check (
    status in ('pending', 'valid', 'invalid', 'imported', 'skipped')
  ),
  constraint import_job_rows_job_row_uidx unique (import_job_id, row_number)
);

create index import_job_rows_job_status_idx
  on public.import_job_rows (import_job_id, status, row_number);

create trigger import_job_rows_set_updated_at before update on public.import_job_rows
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Consent and privacy traceability
-- ---------------------------------------------------------------------------

create table public.profile_consents (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint profile_consents_type_check check (
    consent_type in ('privacy_notice', 'terms_of_use', 'family_link', 'data_processing')
  ),
  constraint profile_consents_revoked_after_accept_check check (
    revoked_at is null or revoked_at >= accepted_at
  )
);

create unique index profile_consents_unique_active_uidx
  on public.profile_consents (
    profile_id,
    consent_type,
    version,
    coalesce(center_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where revoked_at is null;

create index profile_consents_center_type_idx
  on public.profile_consents (center_id, consent_type, accepted_at desc)
  where center_id is not null;

-- ---------------------------------------------------------------------------
-- 5. File metadata complements
-- ---------------------------------------------------------------------------

alter table public.educational_resources
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists published_at timestamptz;

alter table public.educational_resources
  add constraint educational_resources_file_metadata_check
  check (
    resource_type <> 'file'
    or (
      file_name is not null
      and mime_type is not null
      and size_bytes is not null
      and size_bytes > 0
    )
  );

alter table public.classroom_task_attachments
  add column if not exists uploaded_by uuid references public.profiles(id);

alter table public.task_submission_attachments
  add column if not exists uploaded_by uuid references public.profiles(id);

-- ---------------------------------------------------------------------------
-- 6. Defaults for existing and future centers
-- ---------------------------------------------------------------------------

create or replace function public.ensure_center_operational_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.center_settings (center_id)
  values (new.id)
  on conflict (center_id) do nothing;

  insert into public.alert_rules (
    center_id,
    rule_type,
    threshold_percent,
    delay_minutes,
    delivery_channels
  )
  values
    (new.id, 'critical_absenteeism', 80.00, null, array['in_app', 'push']::text[]),
    (new.id, 'attendance_not_recorded', null, 15, array['in_app']::text[])
  on conflict (center_id, rule_type) do nothing;

  return new;
end;
$$;

drop trigger if exists centers_ensure_operational_defaults on public.centers;
create trigger centers_ensure_operational_defaults
  after insert on public.centers
  for each row execute function public.ensure_center_operational_defaults();

insert into public.center_settings (center_id)
select c.id
from public.centers c
on conflict (center_id) do nothing;

insert into public.alert_rules (
  center_id,
  rule_type,
  threshold_percent,
  delay_minutes,
  delivery_channels
)
select c.id, 'critical_absenteeism', 80.00, null, array['in_app', 'push']::text[]
from public.centers c
on conflict (center_id, rule_type) do nothing;

insert into public.alert_rules (
  center_id,
  rule_type,
  threshold_percent,
  delay_minutes,
  delivery_channels
)
select c.id, 'attendance_not_recorded', null, 15, array['in_app']::text[]
from public.centers c
on conflict (center_id, rule_type) do nothing;

-- ---------------------------------------------------------------------------
-- 7. QR and operational RPCs
-- ---------------------------------------------------------------------------

create or replace function public.issue_student_qr_token(
  p_student_id uuid,
  p_ttl_minutes int default null
)
returns table (
  token_id uuid,
  token_plain text,
  token_hash text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students%rowtype;
  ttl_minutes int;
  plain_token text;
  hashed_token text;
begin
  select *
  into student_row
  from public.students
  where id = p_student_id
    and status = 'active';

  if student_row.id is null then
    raise exception 'student not found';
  end if;

  if not (
    public.is_student_profile(student_row.id)
    or public.has_center_role(student_row.center_id, array['center_admin'])
  ) then
    raise exception 'not allowed to issue QR token for this student';
  end if;

  select coalesce(p_ttl_minutes, cs.qr_token_ttl_minutes, 10)
  into ttl_minutes
  from public.center_settings cs
  where cs.center_id = student_row.center_id;

  ttl_minutes = greatest(coalesce(ttl_minutes, 10), 1);
  plain_token = encode(gen_random_bytes(32), 'hex');
  hashed_token = encode(digest(plain_token, 'sha256'), 'hex');

  update public.student_qr_tokens
  set status = case when expires_at is not null and expires_at <= now() then 'expired' else 'revoked' end,
      revoked_at = case when expires_at is null or expires_at > now() then now() else revoked_at end,
      updated_at = now(),
      updated_by = auth.uid()
  where student_id = student_row.id
    and status = 'active';

  insert into public.student_qr_tokens (
    center_id,
    student_id,
    token_hash,
    expires_at,
    created_by,
    updated_by
  ) values (
    student_row.center_id,
    student_row.id,
    hashed_token,
    now() + make_interval(mins => ttl_minutes),
    auth.uid(),
    auth.uid()
  )
  returning id, public.student_qr_tokens.expires_at
  into token_id, expires_at;

  token_plain = plain_token;
  token_hash = hashed_token;
  return next;
end;
$$;

create or replace function public.record_student_presence_by_qr(
  p_token_plain text,
  p_event_type text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row record;
  event_id uuid;
  notification_event text;
  notification_title text;
  notification_body text;
begin
  if p_event_type not in ('entry', 'exit') then
    raise exception 'invalid presence event type';
  end if;

  select
    sqt.id as token_id,
    sqt.center_id,
    sqt.student_id,
    sqt.expires_at,
    sqt.status,
    s.full_name
  into token_row
  from public.student_qr_tokens sqt
  join public.students s on s.id = sqt.student_id
  where sqt.token_hash = encode(digest(p_token_plain, 'sha256'), 'hex')
  limit 1;

  if token_row.token_id is null then
    raise exception 'QR token not found';
  end if;

  if token_row.status <> 'active' or token_row.expires_at <= now() then
    update public.student_qr_tokens
    set status = case when expires_at <= now() then 'expired' else status end,
        updated_at = now(),
        updated_by = auth.uid()
    where id = token_row.token_id;

    raise exception 'QR token is not active';
  end if;

  if not public.has_center_role(token_row.center_id, array['center_admin', 'professor']) then
    raise exception 'not allowed to register student presence';
  end if;

  insert into public.student_presence_events (
    center_id,
    student_id,
    event_type,
    registered_by,
    source,
    notes
  ) values (
    token_row.center_id,
    token_row.student_id,
    p_event_type,
    auth.uid(),
    'qr',
    nullif(p_notes, '')
  )
  returning id into event_id;

  update public.student_qr_tokens
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now(),
      updated_by = auth.uid()
  where id = token_row.token_id;

  if p_event_type = 'entry' then
    notification_event = 'presence_entry';
    notification_title = 'Ingreso registrado';
    notification_body = token_row.full_name || ' ingresó al centro educativo.';
  else
    notification_event = 'presence_exit';
    notification_title = 'Salida registrada';
    notification_body = token_row.full_name || ' salió del centro educativo.';
  end if;

  insert into public.notifications (
    center_id,
    recipient_id,
    event_type,
    title,
    body,
    entity_type,
    entity_id,
    delivery_channels,
    priority,
    metadata
  )
  select
    token_row.center_id,
    gs.guardian_id,
    notification_event,
    notification_title,
    notification_body,
    'student_presence_events',
    event_id,
    array['in_app', 'push']::text[],
    'normal',
    jsonb_build_object('student_id', token_row.student_id, 'event_type', p_event_type)
  from public.guardian_students gs
  where gs.student_id = token_row.student_id
    and gs.status = 'active';

  return event_id;
end;
$$;

create or replace function public.evaluate_attendance_missing_alerts(
  p_center_id uuid,
  p_attendance_date date default current_date,
  p_reference_at timestamptz default now()
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
begin
  if not public.has_center_role(p_center_id, array['center_admin']) then
    raise exception 'not allowed to evaluate attendance alerts for this center';
  end if;

  with settings as (
    select
      c.id as center_id,
      c.timezone,
      coalesce(cs.unattended_class_alert_minutes, 15) as delay_minutes
    from public.centers c
    left join public.center_settings cs on cs.center_id = c.id
    where c.id = p_center_id
  ),
  missing as (
    select
      se.id as schedule_entry_id,
      se.center_id,
      se.assignment_id,
      se.academic_period_id,
      se.starts_at,
      s.delay_minutes
    from public.schedule_entries se
    join settings s on s.center_id = se.center_id
    where se.status = 'active'
      and se.day_of_week = extract(isodow from p_attendance_date)::int
      and (
        (p_reference_at at time zone s.timezone)::time
        >= se.starts_at + make_interval(mins => s.delay_minutes)
      )
      and not exists (
        select 1
        from public.attendance_sessions ats
        where ats.schedule_entry_id = se.id
          and ats.attendance_date = p_attendance_date
          and ats.status <> 'void'
      )
  ),
  inserted as (
    insert into public.alert_events (
      center_id,
      alert_rule_id,
      event_type,
      severity,
      status,
      fingerprint,
      assignment_id,
      schedule_entry_id,
      title,
      body,
      metadata
    )
    select
      m.center_id,
      ar.id,
      'attendance_not_recorded',
      'warning',
      'open',
      m.schedule_entry_id::text || ':' || p_attendance_date::text,
      m.assignment_id,
      m.schedule_entry_id,
      'Asistencia sin registrar',
      'Hay una clase que superó el margen de registro de asistencia.',
      jsonb_build_object(
        'attendance_date', p_attendance_date,
        'delay_minutes', m.delay_minutes,
        'academic_period_id', m.academic_period_id
      )
    from missing m
    left join public.alert_rules ar
      on ar.center_id = m.center_id
     and ar.rule_type = 'attendance_not_recorded'
     and ar.enabled = true
    on conflict (center_id, event_type, fingerprint) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Views for dashboard/reporting gaps
-- ---------------------------------------------------------------------------

create or replace view public.unregistered_attendance_classes
with (security_invoker = true)
as
select
  se.center_id,
  se.academic_period_id,
  se.id as schedule_entry_id,
  se.assignment_id,
  se.day_of_week,
  se.period_number,
  se.starts_at,
  se.ends_at,
  tsa.teacher_id,
  tsa.subject_id,
  tsa.section_id,
  tsa.subgroup_id
from public.schedule_entries se
join public.teacher_subject_assignments tsa on tsa.id = se.assignment_id
where se.status = 'active'
  and se.day_of_week = extract(isodow from current_date)::int
  and not exists (
    select 1
    from public.attendance_sessions ats
    where ats.schedule_entry_id = se.id
      and ats.attendance_date = current_date
      and ats.status <> 'void'
  );

create or replace view public.student_attendance_risk_summary
with (security_invoker = true)
as
select
  ar.center_id,
  s.id as student_id,
  s.full_name,
  s.section_id,
  count(ar.id) as total_records,
  count(ar.id) filter (where ar.status in ('present', 'justified')) as attended_records,
  count(ar.id) filter (where ar.status = 'absent') as absent_records,
  round(
    (count(ar.id) filter (where ar.status in ('present', 'justified'))::numeric
      / nullif(count(ar.id), 0)) * 100,
    2
  ) as attendance_percentage,
  coalesce(cs.attendance_threshold_percent, 80.00) as threshold_percent,
  (
    round(
      (count(ar.id) filter (where ar.status in ('present', 'justified'))::numeric
        / nullif(count(ar.id), 0)) * 100,
      2
    ) < coalesce(cs.attendance_threshold_percent, 80.00)
  ) as is_below_threshold
from public.attendance_records ar
join public.students s on s.id = ar.student_id
left join public.center_settings cs on cs.center_id = ar.center_id
group by ar.center_id, s.id, s.full_name, s.section_id, cs.attendance_threshold_percent;

-- ---------------------------------------------------------------------------
-- 9. Row level security
-- ---------------------------------------------------------------------------

alter table public.center_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;
alter table public.report_exports enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.profile_consents enable row level security;

create policy center_settings_select_center
  on public.center_settings for select
  using (public.can_access_center(center_id));
create policy center_settings_manage_admin
  on public.center_settings for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy notification_preferences_select_own_or_admin
  on public.notification_preferences for select
  using (profile_id = auth.uid() or public.has_center_role(center_id, array['center_admin']));
create policy notification_preferences_manage_own_or_admin
  on public.notification_preferences for all
  using (profile_id = auth.uid() or public.has_center_role(center_id, array['center_admin']))
  with check (profile_id = auth.uid() or public.has_center_role(center_id, array['center_admin']));

create policy notification_deliveries_select_visible
  on public.notification_deliveries for select
  using (
    public.has_center_role(center_id, array['center_admin'])
    or exists (
      select 1
      from public.notifications n
      where n.id = notification_deliveries.notification_id
        and n.recipient_id = auth.uid()
    )
  );
create policy notification_deliveries_manage_admin
  on public.notification_deliveries for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy alert_rules_select_center
  on public.alert_rules for select
  using (public.can_access_center(center_id));
create policy alert_rules_manage_admin
  on public.alert_rules for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy alert_events_select_scoped
  on public.alert_events for select
  using (
    public.has_center_role(center_id, array['center_admin', 'professor'])
    or (student_id is not null and public.is_student_profile(student_id))
    or (student_id is not null and public.is_guardian_of_student(student_id))
  );
create policy alert_events_manage_admin
  on public.alert_events for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy report_exports_select_scoped
  on public.report_exports for select
  using (
    requested_by = auth.uid()
    or public.has_center_role(center_id, array['center_admin'])
  );
create policy report_exports_insert_center_member
  on public.report_exports for insert
  with check (requested_by = auth.uid() and public.can_access_center(center_id));
create policy report_exports_update_admin
  on public.report_exports for update
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy import_job_rows_admin_only
  on public.import_job_rows for all
  using (public.has_center_role(center_id, array['center_admin']))
  with check (public.has_center_role(center_id, array['center_admin']));

create policy profile_consents_select_own_or_admin
  on public.profile_consents for select
  using (
    profile_id = auth.uid()
    or public.is_super_admin()
    or (center_id is not null and public.has_center_role(center_id, array['center_admin']))
  );
create policy profile_consents_insert_own_or_admin
  on public.profile_consents for insert
  with check (
    profile_id = auth.uid()
    or public.is_super_admin()
    or (center_id is not null and public.has_center_role(center_id, array['center_admin']))
  );
create policy profile_consents_update_admin
  on public.profile_consents for update
  using (
    public.is_super_admin()
    or (center_id is not null and public.has_center_role(center_id, array['center_admin']))
  )
  with check (
    public.is_super_admin()
    or (center_id is not null and public.has_center_role(center_id, array['center_admin']))
  );

-- ---------------------------------------------------------------------------
-- 10. Storage bucket for generated report files
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-exports',
  'report-exports',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_report_exports_read
  on storage.objects for select
  using (
    bucket_id = 'report-exports'
    and (
      owner = auth.uid()
      or public.can_access_center(split_part(name, '/', 1)::uuid)
    )
  );

create policy storage_report_exports_insert
  on storage.objects for insert
  with check (
    bucket_id = 'report-exports'
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  );

create policy storage_report_exports_update
  on storage.objects for update
  using (
    bucket_id = 'report-exports'
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  )
  with check (
    bucket_id = 'report-exports'
    and (
      owner = auth.uid()
      or public.has_center_role(split_part(name, '/', 1)::uuid, array['center_admin'])
    )
  );

-- ---------------------------------------------------------------------------
-- 11. Realtime and grants
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.alert_events;
    alter publication supabase_realtime add table public.report_exports;
    alter publication supabase_realtime add table public.notification_deliveries;
  end if;
exception
  when duplicate_object then
    null;
end;
$$;

grant all on table
  public.center_settings,
  public.notification_preferences,
  public.notification_deliveries,
  public.alert_rules,
  public.alert_events,
  public.report_exports,
  public.import_job_rows,
  public.profile_consents
to authenticated;

grant select on
  public.unregistered_attendance_classes,
  public.student_attendance_risk_summary
to authenticated;

grant execute on function public.issue_student_qr_token(uuid, int) to authenticated;
grant execute on function public.record_student_presence_by_qr(text, text, text) to authenticated;
grant execute on function public.evaluate_attendance_missing_alerts(uuid, date, timestamptz) to authenticated;

commit;
