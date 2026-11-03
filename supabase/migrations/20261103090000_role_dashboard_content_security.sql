alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.courses
  add column if not exists resource_type text not null default 'text',
  add column if not exists external_url text,
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists review_status text not null default 'none';

alter table public.courses
  add constraint courses_review_status_check check (review_status in ('none', 'rejected'));

alter table public.exams
  add column if not exists review_status text not null default 'none',
  add constraint exams_review_status_check check (review_status in ('none', 'rejected'));

alter table public.courses
  add constraint courses_resource_type_check
    check (resource_type in ('text', 'external_link', 'document')),
  add constraint courses_external_url_check
    check (
      (resource_type = 'external_link' and external_url is not null and external_url ~ '^https://[^/?#[:space:]]+([/?#][^[:space:]]*)?$' and file_path is null)
      or (resource_type <> 'external_link' and external_url is null)
    ),
  add constraint courses_document_path_check
    check (resource_type <> 'document' or file_path is not null);

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active
    )
$$;

revoke all on function private.is_active_user() from public, anon;
grant execute on function private.is_active_user() to authenticated;

create or replace function private.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = _role
    )
$$;

create or replace function private.teacher_can_classify(
  _level_id uuid,
  _track_id uuid,
  _subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and private.has_role('teacher')
    and private.is_teacher_verified()
    and exists (
      select 1
      from public.teacher_subjects ts
      where ts.teacher_id = auth.uid()
        and ts.subject_id = _subject_id
    )
    and exists (
      select 1
      from public.teacher_academic_assignments aa
      join public.levels l on l.id = aa.level_id
      where aa.teacher_id = auth.uid()
        and aa.level_id = _level_id
        and (
          (not l.requires_track and aa.track_id is null and _track_id is null)
          or (l.requires_track and aa.track_id = _track_id and _track_id is not null)
        )
    )
$$;

revoke all on function private.teacher_can_classify(uuid, uuid, uuid) from public, anon;
grant execute on function private.teacher_can_classify(uuid, uuid, uuid) to authenticated;

create or replace function private.prevent_user_managed_account_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active
    and not private.has_role('admin') then
    raise exception 'FORBIDDEN';
  end if;
  return new;
end
$$;

revoke all on function private.prevent_user_managed_account_status() from public, anon, authenticated;

create trigger trg_profiles_protect_account_status
  before update on public.profiles
  for each row execute function private.prevent_user_managed_account_status();

create or replace function private.protect_teacher_content_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.has_role('admin') then
    return new;
  end if;
  if new.review_status is distinct from old.review_status then
    raise exception 'FORBIDDEN';
  end if;
  if old.review_status = 'rejected' and new.status = 'published' then
    raise exception 'CONTENT_REVIEW_REQUIRED';
  end if;
  return new;
end
$$;

revoke all on function private.protect_teacher_content_review() from public, anon, authenticated;

create trigger trg_courses_protect_review_status
  before update on public.courses
  for each row execute function private.protect_teacher_content_review();
create trigger trg_exams_protect_review_status
  before update on public.exams
  for each row execute function private.protect_teacher_content_review();

drop policy if exists "Courses read" on public.courses;
drop policy if exists "Courses insert" on public.courses;
drop policy if exists "Courses update" on public.courses;
drop policy if exists "Courses delete" on public.courses;

create policy "Courses read" on public.courses for select to authenticated
  using (
    private.has_role('admin')
    or (
      private.has_role('teacher')
      and (author_id = auth.uid() or status = 'published')
    )
    or (
      status = 'published'
      and private.has_role('student')
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.onboarded
          and p.level_id = courses.level_id
          and (courses.track_id is null or p.track_id = courses.track_id)
      )
    )
  );

create policy "Courses insert" on public.courses for insert to authenticated
  with check (
    (
      private.has_role('admin')
      and author_id = auth.uid()
      and (file_path is null or file_path like auth.uid()::text || '/courses/%')
    )
    or (
      author_id = auth.uid()
      and (file_path is null or file_path like auth.uid()::text || '/courses/%')
      and review_status = 'none'
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

create policy "Courses update" on public.courses for update to authenticated
  using (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  )
  with check (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and (file_path is null or file_path like auth.uid()::text || '/courses/%')
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

create policy "Courses delete" on public.courses for delete to authenticated
  using (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and status <> 'published'
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

drop policy if exists "Exams read" on public.exams;
drop policy if exists "Exams insert" on public.exams;
drop policy if exists "Exams update" on public.exams;
drop policy if exists "Exams delete" on public.exams;

create policy "Exams read" on public.exams for select to authenticated
  using (
    private.has_role('admin')
    or (
      private.has_role('teacher')
      and (author_id = auth.uid() or status = 'published')
    )
    or (
      status = 'published'
      and private.has_role('student')
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.onboarded
          and p.level_id = exams.level_id
          and (exams.track_id is null or p.track_id = exams.track_id)
      )
    )
  );

create policy "Exams insert" on public.exams for insert to authenticated
  with check (
    (
      private.has_role('admin')
      and author_id = auth.uid()
      and file_path like auth.uid()::text || '/%'
    )
    or (
      author_id = auth.uid()
      and file_path like auth.uid()::text || '/%'
      and review_status = 'none'
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

create policy "Exams update" on public.exams for update to authenticated
  using (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  )
  with check (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and file_path like auth.uid()::text || '/%'
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

create policy "Exams delete" on public.exams for delete to authenticated
  using (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and status <> 'published'
      and private.teacher_can_classify(level_id, track_id, subject_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Exam files upload" on storage.objects;
drop policy if exists "Exam files read" on storage.objects;
drop policy if exists "Exam files delete" on storage.objects;

create policy "Exam files upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exams'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      private.has_role('admin')
      or (private.has_role('teacher') and private.is_teacher_verified())
    )
  );

create policy "Exam files read" on storage.objects for select to authenticated
  using (
    bucket_id = 'exams'
    and (
      (private.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text)
      or private.has_role('admin')
      or exists (
        select 1 from public.exams e
        where e.file_path = storage.objects.name
          and e.status = 'published'
          and (
            private.has_role('teacher')
            or (
              private.has_role('student')
              and exists (
                select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.onboarded
                  and p.level_id = e.level_id
                  and (e.track_id is null or p.track_id = e.track_id)
              )
            )
          )
      )
    )
  );

create policy "Exam files delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'exams'
    and not exists (
      select 1 from public.exams e where e.file_path = storage.objects.name
    )
    and (
      private.has_role('admin')
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and private.has_role('teacher')
        and private.is_teacher_verified()
      )
    )
  );

create policy "Course files upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      private.has_role('admin')
      or (private.has_role('teacher') and private.is_teacher_verified())
    )
  );

create policy "Course files read" on storage.objects for select to authenticated
  using (
    bucket_id = 'course-files'
    and (
      (private.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text)
      or private.has_role('admin')
      or exists (
        select 1 from public.courses c
        where c.file_path = storage.objects.name
          and c.status = 'published'
          and (
            private.has_role('teacher')
            or (
              private.has_role('student')
              and exists (
                select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.onboarded
                  and p.level_id = c.level_id
                  and (c.track_id is null or p.track_id = c.track_id)
              )
            )
          )
      )
    )
  );

create policy "Course files delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'course-files'
    and not exists (
      select 1 from public.courses c where c.file_path = storage.objects.name
    )
    and (
      private.has_role('admin')
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and private.has_role('teacher')
        and private.is_teacher_verified()
      )
    )
  );

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  roles public.app_role[],
  is_active boolean,
  level_fr text,
  level_ht text,
  track_code text,
  geographical_department text,
  school text,
  teacher_verification_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'FORBIDDEN';
  end if;

  return query
    select
      au.id,
      coalesce(au.email::text, ''),
      coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.full_name),
      au.created_at,
      coalesce(array_agg(distinct ur.role) filter (where ur.role is not null), '{}'::public.app_role[]),
      p.is_active,
      l.name_fr,
      l.name_ht,
      tr.code,
      p.geographical_department,
      p.school,
      p.teacher_verification_status
    from auth.users au
    join public.profiles p on p.id = au.id
    left join public.user_roles ur on ur.user_id = au.id
    left join public.levels l on l.id = p.level_id
    left join public.tracks tr on tr.id = p.track_id
    group by au.id, au.email, au.created_at, p.first_name, p.last_name, p.full_name,
      p.is_active, l.name_fr, l.name_ht, tr.code, p.geographical_department,
      p.school, p.teacher_verification_status
    order by au.created_at desc;
end
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_active(_user_id uuid, _active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'FORBIDDEN';
  end if;
  if _user_id = auth.uid() and not _active then
    raise exception 'CANNOT_DISABLE_SELF';
  end if;

  update public.profiles
  set is_active = _active, updated_at = now()
  where id = _user_id;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
end
$$;

revoke all on function public.admin_set_user_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
