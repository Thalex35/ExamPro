alter table public.profiles
  add column school_email text,
  add column school_phone text;

update public.profiles p
set school_email = s.email,
    school_phone = s.phone
from public.schools s
where p.school_id = s.id
  and (p.school_email is null or p.school_phone is null);

alter table public.profiles
  add constraint profiles_school_email_check
    check (
      school_email is null
      or (
        char_length(school_email) <= 254
        and school_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  add constraint profiles_school_phone_check
    check (
      school_phone is null
      or (
        char_length(school_phone) <= 32
        and school_phone ~ '^\+?[0-9][0-9 ()-]{6,23}$'
      )
    );

create or replace function public.save_student_school_information(
  _name text,
  _email text,
  _phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name_value text := btrim(coalesce(_name, ''));
  email_value text := nullif(lower(btrim(coalesce(_email, ''))), '');
  phone_value text := nullif(btrim(coalesce(_phone, '')), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;
  if char_length(name_value) not between 2 and 200 then raise exception 'SCHOOL_REQUIRED'; end if;
  if char_length(coalesce(email_value, '')) > 254
    or (email_value is not null and email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;
  if char_length(coalesce(phone_value, '')) > 32
    or (phone_value is not null and phone_value !~ '^\+?[0-9][0-9 ()-]{6,23}$') then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;

  update public.profiles
  set school = name_value,
      school_email = email_value,
      school_phone = phone_value,
      updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

revoke all on function public.save_student_school_information(text, text, text)
  from public, anon;
grant execute on function public.save_student_school_information(text, text, text)
  to authenticated;

create or replace function public.finish_student_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  student_profile public.profiles%rowtype;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;

  select * into student_profile
  from public.profiles where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if char_length(trim(coalesce(student_profile.full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if student_profile.level_id is null then raise exception 'LEVEL_REQUIRED'; end if;
  if student_profile.geographical_department is null then
    raise exception 'GEOGRAPHICAL_DEPARTMENT_REQUIRED';
  end if;
  if char_length(trim(coalesce(student_profile.school, ''))) not between 2 and 200 then
    raise exception 'SCHOOL_REQUIRED';
  end if;
  if student_profile.school_email is not null
    and student_profile.school_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;
  if student_profile.school_phone is not null
    and student_profile.school_phone !~ '^\+?[0-9][0-9 ()-]{6,23}$' then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;
  if exists (
    select 1 from public.levels l
    where l.id = student_profile.level_id and l.requires_track
      and not exists (
        select 1 from public.tracks t
        where t.id = student_profile.track_id and t.level_id = l.id
      )
  ) then
    raise exception 'TRACK_REQUIRED';
  end if;

  update public.profiles set onboarded = true, updated_at = now() where id = uid;
end
$$;

revoke all on function public.finish_student_onboarding() from public, anon;
grant execute on function public.finish_student_onboarding() to authenticated;

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
      school_email = case when geographical_department is distinct from _department then null else school_email end,
      school_phone = case when geographical_department is distinct from _department then null else school_phone end,
      teacher_school_contacts_confirmed = case
        when geographical_department is distinct from _department then false
        else teacher_school_contacts_confirmed
      end,
      updated_at = now()
  where id = auth.uid() and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.register_onboarding_school(_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  department text;
  school_id uuid;
  school_status text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if char_length(btrim(coalesce(_name, ''))) not between 2 and 200 then
    raise exception 'SCHOOL_REQUIRED';
  end if;

  select geographical_department into department
  from public.profiles
  where id = uid and not onboarded;
  if not found or department is null then raise exception 'DEPARTMENT_REQUIRED'; end if;

  insert into public.schools (name, geographical_department, submitted_by)
  values (btrim(_name), department, uid)
  on conflict (geographical_department, normalized_name) do nothing;

  select id, verification_status into school_id, school_status
  from public.schools
  where geographical_department = department
    and normalized_name = lower(regexp_replace(btrim(_name), '\s+', ' ', 'g'));

  if school_status is null then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if school_status = 'rejected' then raise exception 'SCHOOL_REJECTED'; end if;
  return school_id;
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
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  select * into school_row from public.schools where id = _school_id;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if school_row.verification_status not in ('verified', 'pending') then
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
      school_email = case when school_id is distinct from school_row.id then null else school_email end,
      school_phone = case when school_id is distinct from school_row.id then null else school_phone end,
      teacher_school_contacts_confirmed = case
        when school_id is distinct from school_row.id then false
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
  if phone_value is null or char_length(phone_value) > 32
    or phone_value !~ '^\+?[0-9][0-9 ()-]{6,23}$' then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;
  if email_value is null or char_length(email_value) > 254
    or email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;

  select s.* into school_row
  from public.schools s
  join public.profiles p on p.school_id = s.id
  where p.id = uid and not p.onboarded;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if school_row.verification_status = 'rejected' then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;

  if school_row.verification_status = 'pending' and school_row.submitted_by = uid then
    update public.schools
    set phone = phone_value, email = email_value, updated_at = now()
    where id = school_row.id;
  elsif school_row.verification_status = 'verified'
    and (
      phone_value is distinct from school_row.phone
      or email_value is distinct from school_row.email
    ) then
    insert into public.school_contact_corrections (
      school_id, submitted_by, proposed_phone, proposed_email
    )
    values (school_row.id, uid, phone_value, email_value)
    on conflict (school_id, submitted_by) where status = 'pending'
    do update set
      proposed_phone = excluded.proposed_phone,
      proposed_email = excluded.proposed_email,
      created_at = now();
  end if;

  update public.profiles
  set school_phone = phone_value,
      school_email = email_value,
      teacher_school_contacts_confirmed = true,
      updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
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
  if char_length(trim(coalesce(teacher_profile.school_email, ''))) = 0 then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;
  if char_length(trim(coalesce(teacher_profile.school_phone, ''))) = 0 then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;
  if not teacher_profile.teacher_school_contacts_confirmed then
    raise exception 'SCHOOL_CONTACTS_REQUIRED';
  end if;
  select verification_status into school_status
  from public.schools where id = teacher_profile.school_id;
  if school_status is null or school_status not in ('verified', 'pending') then
    raise exception 'SCHOOL_NOT_AVAILABLE';
  end if;
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
