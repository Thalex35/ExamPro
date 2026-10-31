create or replace function public.complete_onboarding(
  _role public.app_role,
  _full_name text,
  _level_id uuid,
  _track_id uuid,
  _subject_ids uuid[],
  _school text,
  _department text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_completed boolean;
  has_existing_profile boolean;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _role is null or _role not in ('student', 'teacher') then
    raise exception 'INVALID_ROLE';
  end if;

  select p.onboarded into is_completed
  from public.profiles p
  where p.id = uid
  for update;
  has_existing_profile := found;
  if not has_existing_profile then raise exception 'PROFILE_NOT_AVAILABLE'; end if;

  if exists (
    select 1
    from public.user_roles
    where user_id = uid and role not in ('student', 'teacher')
  ) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  if exists (
    select 1
    from public.user_roles
    where user_id = uid and role in ('student', 'teacher') and role <> _role
  ) then
    raise exception 'ROLE_ALREADY_SELECTED';
  end if;
  if is_completed and exists (
    select 1
    from public.user_roles
    where user_id = uid and role in ('student', 'teacher')
  ) then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;
  if _full_name is not null and (
    char_length(trim(_full_name)) < 1 or char_length(trim(_full_name)) > 120
  ) then
    raise exception 'NAME_INVALID';
  end if;

  insert into public.user_roles (user_id, role)
  values (uid, _role)
  on conflict (user_id, role) do nothing;

  update public.profiles
  set full_name = coalesce(nullif(trim(_full_name), ''), full_name),
      onboarded = false,
      updated_at = now()
  where id = uid;
end
$$;

revoke all on function public.complete_onboarding(
  public.app_role, text, uuid, uuid, uuid[], text, text
) from public, anon;
grant execute on function public.complete_onboarding(
  public.app_role, text, uuid, uuid, uuid[], text, text
) to authenticated;

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
  set full_name = trim(_full_name), onboarded = false, updated_at = now()
  where id = uid
    and (
      not onboarded
      or not exists (
        select 1 from public.user_roles
        where user_id = uid and role in ('student', 'teacher')
      )
    );
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

revoke all on function public.save_onboarding_name(text) from public, anon;
grant execute on function public.save_onboarding_name(text) to authenticated;

revoke all on function public.select_onboarding_role(public.app_role)
  from public, anon, authenticated;
drop function public.select_onboarding_role(public.app_role);

create or replace function private.is_onboarded()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and onboarded
  )
$$;

revoke all on function private.is_onboarded() from public, anon;
grant execute on function private.is_onboarded() to authenticated;

alter policy "Teacher subjects insert" on public.teacher_subjects
  with check (
    teacher_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
  );

alter policy "Courses insert" on public.courses
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
  );
alter policy "Courses update" on public.courses
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  )
  with check (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  );
alter policy "Courses delete" on public.courses
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  );

alter policy "Exams insert" on public.exams
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and file_path like auth.uid()::text || '/%'
  );
alter policy "Exams update" on public.exams
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  )
  with check (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  );
alter policy "Exams delete" on public.exams
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  );

alter policy "Exam files upload" on storage.objects
  with check (
    bucket_id = 'exams'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.has_role('teacher')
    and private.is_onboarded()
  );

alter policy "Exam files delete" on storage.objects
  using (
    bucket_id = 'exams'
    and (
      private.has_role('admin')
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and private.is_onboarded()
      )
    )
  );
