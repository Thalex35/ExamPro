alter table public.profiles
  add column geographical_department text;

alter table public.profiles
  add constraint profiles_geographical_department_check
  check (
    geographical_department is null
    or geographical_department in (
      'Artibonite',
      'Centre',
      'Grand''Anse',
      'Nippes',
      'Nord',
      'Nord-Est',
      'Nord-Ouest',
      'Ouest',
      'Sud',
      'Sud-Est'
    )
  );

update public.profiles
set geographical_department = department
where geographical_department is null
  and department in (
    'Artibonite',
    'Centre',
    'Grand''Anse',
    'Nippes',
    'Nord',
    'Nord-Est',
    'Nord-Ouest',
    'Ouest',
    'Sud',
    'Sud-Est'
  );

update public.profiles p
set onboarded = false, updated_at = now()
from public.user_roles r
where r.user_id = p.id
  and r.role = 'student'
  and p.onboarded
  and p.geographical_department is null;

create or replace function public.save_student_onboarding_level(_level_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;
  if not exists (select 1 from public.levels where id = _level_id) then
    raise exception 'LEVEL_NOT_FOUND';
  end if;

  update public.profiles
  set level_id = _level_id, track_id = null, onboarded = false, updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.save_student_onboarding_department(_geographical_department text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  selected_department text := trim(coalesce(_geographical_department, ''));
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;
  if selected_department not in (
    'Artibonite',
    'Centre',
    'Grand''Anse',
    'Nippes',
    'Nord',
    'Nord-Est',
    'Nord-Ouest',
    'Ouest',
    'Sud',
    'Sud-Est'
  ) then
    raise exception 'GEOGRAPHICAL_DEPARTMENT_INVALID';
  end if;

  update public.profiles
  set geographical_department = selected_department, updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.save_student_onboarding_track(_track_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  selected_level uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;

  select level_id into selected_level
  from public.profiles where id = uid and not onboarded;
  if selected_level is null then raise exception 'LEVEL_REQUIRED'; end if;
  if not exists (
    select 1 from public.levels where id = selected_level and requires_track
  ) then
    raise exception 'TRACK_NOT_REQUIRED';
  end if;

  update public.profiles p
  set track_id = t.id, updated_at = now()
  from public.tracks t
  where p.id = uid and t.id = _track_id and t.level_id = selected_level;
  if not found then raise exception 'TRACK_LEVEL_MISMATCH'; end if;
end
$$;

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

revoke all on function public.save_student_onboarding_department(text) from public, anon;
grant execute on function public.save_student_onboarding_department(text) to authenticated;
