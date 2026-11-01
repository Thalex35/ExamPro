alter table public.profiles
  add column teacher_school_contacts_confirmed boolean not null default false;

update public.profiles p
set teacher_school_contacts_confirmed = true
where p.onboarded
  and exists (
    select 1 from public.user_roles r
    where r.user_id = p.id and r.role = 'teacher'
  );

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

create or replace function public.finish_teacher_onboarding(_phone text)
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
  if btrim(coalesce(_phone, '')) !~ '^[+][1-9][0-9]{7,14}$' then
    raise exception 'PHONE_INVALID';
  end if;

  select * into teacher_profile
  from public.profiles where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if char_length(btrim(coalesce(teacher_profile.full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if not coalesce(teacher_profile.geographical_department = any(array[
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  ]), false) then raise exception 'DEPARTMENT_REQUIRED'; end if;
  if teacher_profile.school_id is null then raise exception 'SCHOOL_REQUIRED'; end if;
  if not teacher_profile.teacher_school_contacts_confirmed then
    raise exception 'SCHOOL_CONTACTS_REQUIRED';
  end if;
  select verification_status, submitted_by into school_status, school_submitter
  from public.schools where id = teacher_profile.school_id;
  if school_status is null or (
    school_status <> 'verified'
    and not (school_status = 'pending' and school_submitter = uid)
  ) then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if not exists (
    select 1 from public.teacher_academic_assignments where teacher_id = uid
  ) then raise exception 'LEVELS_REQUIRED'; end if;
  if exists (
    select 1
    from public.teacher_academic_assignments a
    join public.levels l on l.id = a.level_id
    where a.teacher_id = uid and l.requires_track and a.track_id is null
  ) then raise exception 'TRACK_REQUIRED'; end if;
  if user_email = '' then raise exception 'EMAIL_REQUIRED'; end if;

  update public.profiles
  set phone = btrim(_phone),
      onboarded = true,
      teacher_verification_status = 'pending',
      teacher_verification_note = null,
      updated_at = now()
  where id = uid;

  insert into public.teacher_verification_requests (teacher_id, email, school_id)
  values (uid, user_email, teacher_profile.school_id)
  on conflict (teacher_id) where status = 'pending'
  do update set
    email = excluded.email,
    school_id = excluded.school_id,
    submitted_at = now(),
    review_note = null;
end
$$;
