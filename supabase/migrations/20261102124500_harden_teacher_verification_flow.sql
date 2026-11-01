create or replace function public.save_teacher_onboarding_department(_department text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if _department is null or _department not in (
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  ) then raise exception 'DEPARTMENT_INVALID'; end if;

  update public.profiles
  set geographical_department = _department,
      school_id = case when geographical_department is distinct from _department then null else school_id end,
      school = case when geographical_department is distinct from _department then null else school end,
      teacher_school_contacts_confirmed = case
        when geographical_department is distinct from _department then false
        else teacher_school_contacts_confirmed
      end,
      updated_at = now()
  where id = auth.uid() and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.save_onboarding_school(_school_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  school_row public.schools%rowtype;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (private.has_role('teacher') or private.has_role('student')) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  select * into school_row from public.schools where id = _school_id;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if school_row.verification_status <> 'verified'
    and not (school_row.verification_status = 'pending' and school_row.submitted_by = uid) then
    raise exception 'SCHOOL_NOT_AVAILABLE';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = uid and not onboarded
      and geographical_department = school_row.geographical_department
  ) then raise exception 'SCHOOL_DEPARTMENT_MISMATCH'; end if;

  update public.profiles
  set school_id = school_row.id,
      school = school_row.name,
      teacher_school_contacts_confirmed = case
        when school_id is distinct from school_row.id and private.has_role('teacher') then false
        else teacher_school_contacts_confirmed
      end,
      updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.save_teacher_school_contacts(_phone text, _email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  school_row public.schools%rowtype;
  phone_value text := nullif(btrim(coalesce(_phone, '')), '');
  email_value text := nullif(lower(btrim(coalesce(_email, ''))), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if char_length(coalesce(phone_value, '')) > 32 then raise exception 'SCHOOL_PHONE_INVALID'; end if;
  if char_length(coalesce(email_value, '')) > 254 then raise exception 'SCHOOL_EMAIL_INVALID'; end if;
  if phone_value is not null and phone_value !~ '^\+?[0-9][0-9 ()-]{6,23}$' then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;
  if email_value is not null and email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;

  select s.* into school_row
  from public.schools s
  join public.profiles p on p.school_id = s.id
  where p.id = uid and not p.onboarded;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;

  if school_row.verification_status = 'pending' and school_row.submitted_by = uid then
    update public.schools
    set phone = coalesce(phone_value, phone),
        email = coalesce(email_value, email),
        updated_at = now()
    where id = school_row.id;
  elsif school_row.verification_status = 'verified' then
    if phone_value is not null and phone_value is distinct from school_row.phone
      or email_value is not null and email_value is distinct from school_row.email then
      insert into public.school_contact_corrections (
        school_id, submitted_by, proposed_phone, proposed_email
      )
      values (school_row.id, uid, phone_value, email_value)
      on conflict (school_id, submitted_by) where status = 'pending'
      do update set
        proposed_phone = coalesce(excluded.proposed_phone, public.school_contact_corrections.proposed_phone),
        proposed_email = coalesce(excluded.proposed_email, public.school_contact_corrections.proposed_email),
        created_at = now();
    end if;
  else
    raise exception 'SCHOOL_NOT_AVAILABLE';
  end if;

  update public.profiles
  set teacher_school_contacts_confirmed = true, updated_at = now()
  where id = uid and not onboarded;
end
$$;

revoke all on function public.save_teacher_school_contacts(text, text) from public, anon;
grant execute on function public.save_teacher_school_contacts(text, text) to authenticated;

create or replace function public.admin_review_teacher_verification(
  _request_id uuid,
  _status text,
  _review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.teacher_verification_requests%rowtype;
  school_status text;
  note_value text := nullif(btrim(coalesce(_review_note, '')), '');
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _status not in ('approved', 'rejected') then raise exception 'INVALID_STATUS'; end if;
  if char_length(coalesce(note_value, '')) > 500 then raise exception 'REVIEW_NOTE_TOO_LONG'; end if;
  select * into request_row from public.teacher_verification_requests
  where id = _request_id and status = 'pending'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  if _status = 'approved' then
    select verification_status into school_status
    from public.schools where id = request_row.school_id;
    if school_status is distinct from 'verified' then
      raise exception 'SCHOOL_NOT_VERIFIED';
    end if;
  end if;

  update public.teacher_verification_requests
  set status = _status,
      review_note = note_value,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _request_id;
  update public.profiles
  set teacher_verification_status = _status,
      teacher_verification_note = note_value,
      updated_at = now()
  where id = request_row.teacher_id;
end
$$;

create or replace function public.resubmit_teacher_verification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  teacher_profile public.profiles%rowtype;
  school_status text;
  school_submitter uuid;
  user_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  select * into teacher_profile from public.profiles
  where id = uid and onboarded and teacher_verification_status = 'rejected';
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if teacher_profile.school_id is null or user_email = '' then raise exception 'PROFILE_INCOMPLETE'; end if;
  select verification_status, submitted_by into school_status, school_submitter
  from public.schools where id = teacher_profile.school_id;
  if school_status is null or (
    school_status <> 'verified'
    and not (school_status = 'pending' and school_submitter = uid)
  ) then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;

  update public.profiles
  set teacher_verification_status = 'pending', teacher_verification_note = null, updated_at = now()
  where id = uid;
  insert into public.teacher_verification_requests (teacher_id, email, school_id)
  values (uid, user_email, teacher_profile.school_id);
end
$$;
