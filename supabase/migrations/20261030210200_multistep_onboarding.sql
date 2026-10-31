alter table public.profiles
  add column phone text,
  add constraint profiles_phone_e164_check
    check (phone is null or phone ~ '^[+][1-9][0-9]{7,14}$');

create table public.teacher_academic_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  level_id uuid not null references public.levels(id),
  track_id uuid references public.tracks(id),
  created_at timestamptz not null default now()
);

create unique index teacher_academic_assignments_level_unique
  on public.teacher_academic_assignments (teacher_id, level_id)
  where track_id is null;
create unique index teacher_academic_assignments_track_unique
  on public.teacher_academic_assignments (teacher_id, track_id)
  where track_id is not null;
create index teacher_academic_assignments_teacher_idx
  on public.teacher_academic_assignments (teacher_id);

alter table public.teacher_academic_assignments enable row level security;
grant select on public.teacher_academic_assignments to authenticated;
grant all on public.teacher_academic_assignments to service_role;

create policy "Teacher academic assignments read"
  on public.teacher_academic_assignments for select to authenticated
  using (teacher_id = auth.uid() or private.has_role('admin'));

create or replace function public.validate_teacher_academic_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  level_requires_track boolean;
begin
  select l.requires_track
  into level_requires_track
  from public.levels l
  where l.id = new.level_id;

  if level_requires_track is null then
    raise exception 'LEVEL_NOT_FOUND';
  end if;

  if new.track_id is not null and not exists (
    select 1
    from public.tracks t
    where t.id = new.track_id
      and t.level_id = new.level_id
      and level_requires_track
  ) then
    raise exception 'TRACK_LEVEL_MISMATCH';
  end if;

  return new;
end
$$;

create trigger trg_teacher_academic_assignment_classification
  before insert or update on public.teacher_academic_assignments
  for each row execute function public.validate_teacher_academic_assignment();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case when new.raw_user_meta_data->>'language' = 'ht' then 'ht' else 'fr' end
  );
  return new;
end
$$;

create or replace function public.select_onboarding_role(_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _role not in ('student', 'teacher') then raise exception 'INVALID_ROLE'; end if;
  if exists (
    select 1 from public.user_roles where user_id = uid and role not in ('student', 'teacher')
  ) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  if exists (
    select 1 from public.user_roles
    where user_id = uid and role in ('student', 'teacher') and role <> _role
  ) then
    raise exception 'ROLE_ALREADY_SELECTED';
  end if;
  if not exists (
    select 1 from public.profiles where id = uid and not onboarded
  ) then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;

  insert into public.user_roles (user_id, role)
  values (uid, _role)
  on conflict (user_id, role) do nothing;
end
$$;

create or replace function public.save_onboarding_name(_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(trim(coalesce(_full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if exists (select 1 from public.user_roles where user_id = uid and role = 'admin') then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;

  update public.profiles
  set full_name = trim(_full_name), updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

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
  set level_id = _level_id, track_id = null, department = null, onboarded = false, updated_at = now()
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
  set track_id = t.id, department = t.code, updated_at = now()
  from public.tracks t
  where p.id = uid and t.id = _track_id and t.level_id = selected_level;
  if not found then raise exception 'TRACK_LEVEL_MISMATCH'; end if;
end
$$;

create or replace function public.save_teacher_onboarding_school(_school text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if char_length(trim(coalesce(_school, ''))) not between 1 and 200 then
    raise exception 'SCHOOL_REQUIRED';
  end if;

  update public.profiles
  set school = trim(_school), updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

create or replace function public.save_teacher_onboarding_levels(_level_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if coalesce(cardinality(_level_ids), 0) = 0 then raise exception 'LEVELS_REQUIRED'; end if;
  if cardinality(_level_ids) <> (
    select count(distinct selected.level_id) from unnest(_level_ids) as selected(level_id)
  ) then
    raise exception 'DUPLICATE_LEVEL';
  end if;
  if exists (
    select 1
    from unnest(_level_ids) as selected(level_id)
    left join public.levels l on l.id = selected.level_id
    where l.id is null
  ) then
    raise exception 'LEVEL_NOT_FOUND';
  end if;
  if not exists (select 1 from public.profiles where id = uid and not onboarded) then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;

  delete from public.teacher_academic_assignments where teacher_id = uid;
  insert into public.teacher_academic_assignments (teacher_id, level_id)
  select uid, selected.level_id
  from unnest(_level_ids) as selected(level_id);
end
$$;

create or replace function public.save_teacher_onboarding_tracks(_track_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if coalesce(cardinality(_track_ids), 0) = 0 then raise exception 'TRACKS_REQUIRED'; end if;
  if cardinality(_track_ids) <> (
    select count(distinct selected.track_id) from unnest(_track_ids) as selected(track_id)
  ) then
    raise exception 'DUPLICATE_TRACK';
  end if;
  if not exists (select 1 from public.profiles where id = uid and not onboarded) then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;
  if exists (
    select 1
    from unnest(_track_ids) as selected(track_id)
    join public.tracks t on t.id = selected.track_id
    where not exists (
      select 1
      from public.teacher_academic_assignments a
      join public.levels l on l.id = a.level_id
      where a.teacher_id = uid
        and a.level_id = t.level_id
        and l.requires_track
    )
  ) then
    raise exception 'TRACK_NOT_SELECTED_FOR_LEVEL';
  end if;
  if exists (
    select 1
    from public.teacher_academic_assignments a
    join public.levels l on l.id = a.level_id
    where a.teacher_id = uid
      and l.requires_track
      and not exists (
        select 1
        from unnest(_track_ids) as selected(track_id)
        join public.tracks t on t.id = selected.track_id
        where t.level_id = a.level_id
      )
  ) then
    raise exception 'TRACK_REQUIRED';
  end if;

  delete from public.teacher_academic_assignments a
  using public.levels l
  where a.teacher_id = uid and l.id = a.level_id and l.requires_track;

  insert into public.teacher_academic_assignments (teacher_id, level_id, track_id)
  select uid, t.level_id, t.id
  from unnest(_track_ids) as selected(track_id)
  join public.tracks t on t.id = selected.track_id;
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

create or replace function public.finish_teacher_onboarding(_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  teacher_profile public.profiles%rowtype;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if trim(coalesce(_phone, '')) !~ '^[+][1-9][0-9]{7,14}$' then
    raise exception 'PHONE_INVALID';
  end if;

  select * into teacher_profile
  from public.profiles where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if char_length(trim(coalesce(teacher_profile.full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if char_length(trim(coalesce(teacher_profile.school, ''))) not between 1 and 200 then
    raise exception 'SCHOOL_REQUIRED';
  end if;
  if not exists (
    select 1 from public.teacher_academic_assignments where teacher_id = uid
  ) then
    raise exception 'LEVELS_REQUIRED';
  end if;
  if exists (
    select 1
    from public.teacher_academic_assignments a
    join public.levels l on l.id = a.level_id
    where a.teacher_id = uid and l.requires_track and a.track_id is null
  ) then
    raise exception 'TRACK_REQUIRED';
  end if;

  update public.profiles
  set phone = trim(_phone), onboarded = true, updated_at = now()
  where id = uid;
end
$$;

revoke update, insert on public.profiles from authenticated;
grant update (full_name, language, level_id, track_id, school, department, updated_at)
  on public.profiles to authenticated;

revoke execute on function public.complete_onboarding(
  public.app_role, text, uuid, uuid, uuid[], text, text
) from public, anon, authenticated;

revoke all on function public.select_onboarding_role(public.app_role) from public, anon;
revoke all on function public.save_onboarding_name(text) from public, anon;
revoke all on function public.save_student_onboarding_level(uuid) from public, anon;
revoke all on function public.save_student_onboarding_track(uuid) from public, anon;
revoke all on function public.save_teacher_onboarding_school(text) from public, anon;
revoke all on function public.save_teacher_onboarding_levels(uuid[]) from public, anon;
revoke all on function public.save_teacher_onboarding_tracks(uuid[]) from public, anon;
revoke all on function public.finish_student_onboarding() from public, anon;
revoke all on function public.finish_teacher_onboarding(text) from public, anon;

grant execute on function public.select_onboarding_role(public.app_role) to authenticated;
grant execute on function public.save_onboarding_name(text) to authenticated;
grant execute on function public.save_student_onboarding_level(uuid) to authenticated;
grant execute on function public.save_student_onboarding_track(uuid) to authenticated;
grant execute on function public.save_teacher_onboarding_school(text) to authenticated;
grant execute on function public.save_teacher_onboarding_levels(uuid[]) to authenticated;
grant execute on function public.save_teacher_onboarding_tracks(uuid[]) to authenticated;
grant execute on function public.finish_student_onboarding() to authenticated;
grant execute on function public.finish_teacher_onboarding(text) to authenticated;
