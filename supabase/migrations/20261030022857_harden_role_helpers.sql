create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = _role
  )
$$;

revoke all on function private.has_role(public.app_role) from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['levels','tracks','subjects','level_subjects','track_subjects','chapters','topics'] loop
    execute format(
      'alter policy "Admins manage catalog" on public.%I using (private.has_role(''admin'')) with check (private.has_role(''admin''))',
      t
    );
  end loop;
end
$$;

alter policy "Own profile read" on public.profiles
  using (id = auth.uid() or private.has_role('admin'));
alter policy "Own roles read" on public.user_roles
  using (user_id = auth.uid() or private.has_role('admin'));

alter policy "Teacher subjects read" on public.teacher_subjects
  using (teacher_id = auth.uid() or private.has_role('admin'));
alter policy "Teacher subjects insert" on public.teacher_subjects
  with check (teacher_id = auth.uid() and private.has_role('teacher'));

alter policy "Courses read" on public.courses
  using (status = 'published' or author_id = auth.uid() or private.has_role('admin'));
alter policy "Courses insert" on public.courses
  with check (author_id = auth.uid() and private.has_role('teacher'));
alter policy "Courses update" on public.courses
  using (author_id = auth.uid() or private.has_role('admin'))
  with check (author_id = auth.uid() or private.has_role('admin'));
alter policy "Courses delete" on public.courses
  using (author_id = auth.uid() or private.has_role('admin'));

alter policy "Exams read" on public.exams
  using (status = 'published' or author_id = auth.uid() or private.has_role('admin'));
alter policy "Exams insert" on public.exams
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and file_path like auth.uid()::text || '/%'
  );
alter policy "Exams update" on public.exams
  using (author_id = auth.uid() or private.has_role('admin'))
  with check (author_id = auth.uid() or private.has_role('admin'));
alter policy "Exams delete" on public.exams
  using (author_id = auth.uid() or private.has_role('admin'));

alter policy "Exam files upload" on storage.objects
  with check (
    bucket_id = 'exams'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.has_role('teacher')
  );
alter policy "Exam files read" on storage.objects
  using (
    bucket_id = 'exams'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.has_role('admin')
      or exists (
        select 1
        from public.exams e
        where e.file_path = storage.objects.name
          and e.status = 'published'
      )
    )
  );
alter policy "Exam files delete" on storage.objects
  using (
    bucket_id = 'exams'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.has_role('admin')
    )
  );

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role, _enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _enabled then insert into public.user_roles(user_id, role) values (_user_id,_role) on conflict do nothing;
  else
    if _user_id = auth.uid() and _role = 'admin' then raise exception 'CANNOT_REMOVE_SELF_ADMIN'; end if;
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop function public.has_role(uuid, public.app_role);
