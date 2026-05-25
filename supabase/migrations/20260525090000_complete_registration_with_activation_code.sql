create or replace function public.complete_registration_with_activation_code(
  p_center_id uuid,
  p_code_hash text,
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_expected_role text,
  p_mep_email text default null,
  p_provider text default 'email'
)
returns table (
  activation_code_id uuid,
  role text,
  center_id uuid,
  academic_period_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.activation_codes%rowtype;
  profile_email text := lower(trim(p_email));
  profile_name text := coalesce(nullif(trim(p_display_name), ''), split_part(lower(trim(p_email)), '@', 1));
  normalized_mep_email text := nullif(lower(trim(coalesce(p_mep_email, ''))), '');
begin
  if p_user_id is null or profile_email = '' or p_expected_role is null then
    raise exception 'missing registration data';
  end if;

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

  if code_row.role is distinct from p_expected_role then
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
    p_center_id,
    code_row.role,
    true,
    p_user_id
  )
  on conflict (user_id, center_id, role) do update set
    is_active = true;

  if code_row.role = 'professor' and code_row.metadata ? 'teacher_id' then
    update public.teachers
    set profile_id = p_user_id,
        email = profile_email,
        updated_at = now(),
        updated_by = p_user_id
    where id = (code_row.metadata->>'teacher_id')::uuid
      and center_id = p_center_id;
  end if;

  update public.activation_codes
  set status = 'consumed',
      consumed_at = now(),
      consumed_by = p_user_id,
      updated_at = now(),
      updated_by = p_user_id
  where id = code_row.id;

  if code_row.role = 'guardian' then
    perform public.link_guardian_students(code_row.id, p_user_id, 'v1');
  end if;

  insert into public.audit_logs (
    center_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) values (
    p_center_id,
    p_user_id,
    'registration_completed_with_activation_code',
    'activation_code',
    code_row.id,
    jsonb_build_object('role', code_row.role, 'email', profile_email)
  );

  return query
  select code_row.id, code_row.role, code_row.center_id, code_row.academic_period_id;
end;
$$;

grant execute on function public.complete_registration_with_activation_code(uuid, text, uuid, text, text, text, text, text)
  to authenticated;
