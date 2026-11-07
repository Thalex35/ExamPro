create table public.exam_favorites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, exam_id)
);

create index exam_favorites_student_created_idx
  on public.exam_favorites (student_id, created_at desc);

alter table public.exam_favorites enable row level security;
revoke all on public.exam_favorites from public, anon, authenticated;
grant select, insert, delete on public.exam_favorites to authenticated;

create policy "Students manage their own exam favorites"
  on public.exam_favorites for all to authenticated
  using (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.exams e
      join public.profiles p on p.id = auth.uid()
      where e.id = exam_id
        and e.status = 'published'
        and p.onboarded
        and p.level_id = e.level_id
        and (e.track_id is null or p.track_id = e.track_id)
    )
  )
  with check (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
    and exists (
      select 1
      from public.exams e
      join public.profiles p on p.id = auth.uid()
      where e.id = exam_id
        and e.status = 'published'
        and p.onboarded
        and p.level_id = e.level_id
        and (e.track_id is null or p.track_id = e.track_id)
    )
  );
