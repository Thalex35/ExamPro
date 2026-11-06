alter table public.courses
  drop constraint if exists courses_resource_type_check,
  drop constraint if exists courses_external_url_check;

alter table public.courses
  add constraint courses_resource_type_check
    check (resource_type in ('text', 'external_link', 'document', 'video')),
  add constraint courses_external_url_check
    check (
      (
        resource_type in ('external_link', 'video')
        and external_url is not null
        and external_url ~ '^https://[^/?#[:space:]]+([/?#][^[:space:]]*)?$'
        and file_path is null
      )
      or (
        resource_type not in ('external_link', 'video')
        and external_url is null
      )
    );

create table public.course_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  progress_percent smallint not null default 0
    check (progress_percent between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, course_id),
  constraint course_progress_completion_check
    check ((progress_percent = 100) = (completed_at is not null))
);

create index course_progress_student_updated_idx
  on public.course_progress (student_id, updated_at desc);

alter table public.course_progress enable row level security;
revoke all on public.course_progress from public, anon, authenticated;
grant select, insert, update on public.course_progress to authenticated;

create policy "Students manage their own course progress"
  on public.course_progress for all to authenticated
  using (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = course_id
        and c.status = 'published'
        and p.onboarded
        and p.level_id = c.level_id
        and (c.track_id is null or p.track_id = c.track_id)
    )
  )
  with check (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = course_id
        and c.status = 'published'
        and p.onboarded
        and p.level_id = c.level_id
        and (c.track_id is null or p.track_id = c.track_id)
    )
  );

create table public.course_favorites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create index course_favorites_student_created_idx
  on public.course_favorites (student_id, created_at desc);

alter table public.course_favorites enable row level security;
revoke all on public.course_favorites from public, anon, authenticated;
grant select, insert, delete on public.course_favorites to authenticated;

create policy "Students manage their own course favorites"
  on public.course_favorites for all to authenticated
  using (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = course_id
        and c.status = 'published'
        and p.onboarded
        and p.level_id = c.level_id
        and (c.track_id is null or p.track_id = c.track_id)
    )
  )
  with check (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = course_id
        and c.status = 'published'
        and p.onboarded
        and p.level_id = c.level_id
        and (c.track_id is null or p.track_id = c.track_id)
    )
  );

create table public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  resource_type text not null check (resource_type in ('external_link', 'video', 'document')),
  external_url text,
  file_path text,
  file_name text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint course_resources_location_check check (
    (
      resource_type = 'document'
      and file_path is not null
      and file_path like author_id::text || '/courses/%'
      and external_url is null
    )
    or (
      resource_type in ('external_link', 'video')
      and external_url is not null
      and external_url ~ '^https://[^/?#[:space:]]+([/?#][^[:space:]]*)?$'
      and file_path is null
    )
  )
);

create index course_resources_course_order_idx
  on public.course_resources (course_id, sort_order, created_at);

alter table public.course_resources enable row level security;
revoke all on public.course_resources from public, anon, authenticated;
grant select, insert, update, delete on public.course_resources to authenticated;

create policy "Course resources readable with their course"
  on public.course_resources for select to authenticated
  using (
    private.has_role('admin')
    or exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.author_id = auth.uid()
          or (
            c.status = 'published'
            and private.has_role('teacher')
          )
          or (
            c.status = 'published'
            and private.has_role('student')
            and exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.onboarded
                and p.level_id = c.level_id
                and (c.track_id is null or p.track_id = c.track_id)
            )
          )
        )
    )
  );

create policy "Course authors manage their resources"
  on public.course_resources for all to authenticated
  using (
    private.has_role('admin')
    or (
      author_id = auth.uid()
      and exists (
        select 1
        from public.courses c
        where c.id = course_id
          and c.author_id = auth.uid()
          and private.teacher_can_classify(c.level_id, c.track_id, c.subject_id)
      )
    )
  )
  with check (
    (
      private.has_role('admin')
      or (
        author_id = auth.uid()
        and exists (
          select 1
          from public.courses c
          where c.id = course_id
            and c.author_id = auth.uid()
            and private.teacher_can_classify(c.level_id, c.track_id, c.subject_id)
        )
      )
    )
    and (
      private.has_role('admin')
      or file_path is null
      or file_path like auth.uid()::text || '/courses/%'
    )
  );

create policy "Published supplemental course files readable"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-files'
    and exists (
      select 1
      from public.course_resources r
      join public.courses c on c.id = r.course_id
      where r.file_path = storage.objects.name
        and c.status = 'published'
        and (
          private.has_role('admin')
          or private.has_role('teacher')
          or (
            private.has_role('student')
            and exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.onboarded
                and p.level_id = c.level_id
                and (c.track_id is null or p.track_id = c.track_id)
            )
          )
        )
    )
  );

create policy "Admins upload course files for course authors"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-files'
    and private.has_role('admin')
    and name like '%/courses/%'
  );

create policy "Prevent deleting attached course files"
  on storage.objects as restrictive for delete to authenticated
  using (
    bucket_id <> 'course-files'
    or (
      not exists (
        select 1 from public.courses c where c.file_path = storage.objects.name
      )
      and not exists (
        select 1 from public.course_resources r where r.file_path = storage.objects.name
      )
    )
  );
