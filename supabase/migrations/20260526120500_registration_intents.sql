create table if not exists public.registration_intents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  center_id uuid not null references public.centers(id) on delete cascade,
  activation_code_id uuid not null references public.activation_codes(id) on delete cascade,
  code_hash text not null,
  role text not null,
  status text not null default 'pending_email_confirmation',
  user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_intents_role_check check (role in ('center_admin', 'professor', 'guardian')),
  constraint registration_intents_status_check check (status in ('pending_email_confirmation', 'completed', 'expired', 'cancelled'))
);

create index if not exists registration_intents_email_status_idx
  on public.registration_intents (lower(email), status, created_at desc);
create index if not exists registration_intents_code_idx
  on public.registration_intents (activation_code_id);

alter table public.registration_intents enable row level security;

drop policy if exists registration_intents_admin_select on public.registration_intents;
create policy registration_intents_admin_select
  on public.registration_intents for select
  using (public.is_super_admin() or public.can_access_center(center_id));

create or replace function public.create_registration_intent(
  p_center_id uuid,
  p_code_hash text,
  p_email text,
  p_expected_role text
)
returns table (
  registration_intent_id uuid,
  activation_code_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.activation_codes%rowtype;
  normalized_email text := lower(trim(p_email));
  intent_id uuid;
begin
  if normalized_email = '' or p_expected_role is null then
    raise exception 'missing registration intent data';
  end if;

  select *
  into code_row
  from public.activation_codes
  where center_id = p_center_id
    and code_hash = p_code_hash;

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

  if code_row.role is distinct from p_expected_role then
    raise exception 'activation code role mismatch';
  end if;

  update public.registration_intents
  set status = 'cancelled',
      updated_at = now()
  where lower(email) = normalized_email
    and status = 'pending_email_confirmation';

  insert into public.registration_intents (
    email,
    center_id,
    activation_code_id,
    code_hash,
    role,
    expires_at
  ) values (
    normalized_email,
    p_center_id,
    code_row.id,
    p_code_hash,
    code_row.role,
    least(code_row.expires_at, now() + interval '24 hours')
  )
  returning id into intent_id;

  return query
  select intent_id, code_row.id, least(code_row.expires_at, now() + interval '24 hours');
end;
$$;

create or replace function public.complete_registration_intent_for_user(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_mep_email text default null,
  p_provider text default 'email'
)
returns table (
  registration_intent_id uuid,
  activation_code_id uuid,
  role text,
  center_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  intent_row public.registration_intents%rowtype;
  code_row public.activation_codes%rowtype;
  profile_email text := lower(trim(p_email));
  profile_name text := coalesce(nullif(trim(p_display_name), ''), split_part(lower(trim(p_email)), '@', 1));
  normalized_mep_email text := nullif(lower(trim(coalesce(p_mep_email, ''))), '');
begin
  if p_user_id is null or profile_email = '' then
    raise exception 'missing registration completion data';
  end if;

  select *
  into intent_row
  from public.registration_intents
  where lower(email) = profile_email
    and status = 'pending_email_confirmation'
  order by created_at desc
  limit 1
  for update;

  if intent_row.id is null then
    raise exception 'registration intent not found';
  end if;

  if intent_row.expires_at <= now() then
    update public.registration_intents
    set status = 'expired',
        updated_at = now()
    where id = intent_row.id;
    raise exception 'registration intent expired';
  end if;

  select *
  into code_row
  from public.activation_codes
  where id = intent_row.activation_code_id
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

  if code_row.role is distinct from intent_row.role then
    raise exception 'activation code role mismatch';
  end if;

  insert into public.profiles (
    id,
    email,
    mep_email,
    display_name,
    provider
  ) values (
    p_user_id,
    profile_email,
    normalized_mep_email,
    profile_name,
    coalesce(nullif(p_provider, ''), 'email')
  )
  on conflict (id) do update set
    email = excluded.email,
    mep_email = coalesce(excluded.mep_email, public.profiles.mep_email),
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    provider = excluded.provider,
    status = 'active',
    updated_at = now();

  insert into public.user_roles (
    user_id,
    center_id,
    role,
    is_active,
    created_by
  ) values (
    p_user_id,
    intent_row.center_id,
    intent_row.role,
    true,
    p_user_id
  )
  on conflict (user_id, center_id, role) do update set
    is_active = true;

  if intent_row.role = 'professor' and code_row.metadata ? 'teacher_id' then
    update public.teachers
    set profile_id = p_user_id,
        email = profile_email,
        updated_at = now(),
        updated_by = p_user_id
    where id = (code_row.metadata->>'teacher_id')::uuid
      and center_id = intent_row.center_id;
  end if;

  update public.activation_codes
  set status = 'consumed',
      consumed_at = now(),
      consumed_by = p_user_id,
      updated_at = now(),
      updated_by = p_user_id
  where id = code_row.id;

  if intent_row.role = 'guardian' then
    perform public.link_guardian_students(code_row.id, p_user_id, 'v1');
  end if;

  update public.registration_intents
  set status = 'completed',
      user_id = p_user_id,
      completed_at = now(),
      updated_at = now()
  where id = intent_row.id;

  insert into public.audit_logs (
    center_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    intent_row.center_id,
    p_user_id,
    'registration_intent_completed',
    'registration_intent',
    intent_row.id,
    jsonb_build_object('role', intent_row.role, 'email', profile_email, 'activation_code_id', code_row.id)
  );

  return query
  select intent_row.id, code_row.id, intent_row.role, intent_row.center_id;
end;
$$;

grant execute on function public.create_registration_intent(uuid, text, text, text) to anon, authenticated;
grant execute on function public.complete_registration_intent_for_user(uuid, text, text, text, text) to authenticated;
