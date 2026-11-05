create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('course', 'exam', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 10 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index content_reports_pending_unique
  on public.content_reports (reporter_id, target_type, target_id)
  where status = 'pending';
create index content_reports_status_created_idx
  on public.content_reports (status, created_at desc);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from public, anon, authenticated;
grant select on public.content_reports to authenticated;
grant update (status, admin_note, resolved_at) on public.content_reports to authenticated;
grant all on public.content_reports to service_role;

create policy "Reporters and admins read content reports"
  on public.content_reports for select to authenticated
  using (reporter_id = auth.uid() or private.has_role('admin'));

create policy "Admins update content reports"
  on public.content_reports for update to authenticated
  using (private.has_role('admin'))
  with check (
    private.has_role('admin')
    and status in ('pending', 'resolved', 'dismissed')
  );

create or replace function public.submit_content_report(
  _target_type text,
  _target_id uuid,
  _reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter uuid := auth.uid();
  report_id uuid;
  target_author uuid;
  student_level uuid;
  student_track uuid;
begin
  if reporter is null or not private.is_active_user() then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not (private.has_role('student') or private.has_role('teacher')) then
    raise exception 'REPORTER_ROLE_REQUIRED';
  end if;
  if _target_type not in ('course', 'exam', 'user') then
    raise exception 'INVALID_REPORT_TARGET';
  end if;
  if char_length(btrim(coalesce(_reason, ''))) not between 10 and 500 then
    raise exception 'INVALID_REPORT_REASON';
  end if;

  if private.has_role('student') then
    select p.level_id, p.track_id into student_level, student_track
    from public.profiles p
    where p.id = reporter and p.onboarded;
    if not found then raise exception 'STUDENT_PROFILE_REQUIRED'; end if;
  end if;

  if _target_type = 'course' then
    select c.author_id into target_author
    from public.courses c
    where c.id = _target_id
      and c.status = 'published'
      and (
        not private.has_role('student')
        or (
          c.level_id = student_level
          and (c.track_id is null or c.track_id = student_track)
        )
      );
  elsif _target_type = 'exam' then
    select e.author_id into target_author
    from public.exams e
    where e.id = _target_id
      and e.status = 'published'
      and (
        not private.has_role('student')
        or (
          e.level_id = student_level
          and (e.track_id is null or e.track_id = student_track)
        )
      );
  else
    if _target_id = reporter then raise exception 'CANNOT_REPORT_SELF'; end if;
    select p.id into target_author
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role = 'teacher'
    where p.id = _target_id and p.is_active;
  end if;

  if target_author is null then raise exception 'REPORT_TARGET_NOT_AVAILABLE'; end if;
  if target_author = reporter then raise exception 'CANNOT_REPORT_OWN_CONTENT'; end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason)
  values (reporter, _target_type, _target_id, btrim(_reason))
  on conflict (reporter_id, target_type, target_id) where status = 'pending'
  do nothing
  returning id into report_id;

  if report_id is null then
    select r.id into report_id
    from public.content_reports r
    where r.reporter_id = reporter
      and r.target_type = _target_type
      and r.target_id = _target_id
      and r.status = 'pending';
  end if;
  return report_id;
end
$$;

revoke all on function public.submit_content_report(text, uuid, text) from public, anon;
grant execute on function public.submit_content_report(text, uuid, text) to authenticated;

create or replace function private.notify_content_report_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.insert_notification(
      admins.user_id, 'moderation',
      case when new.target_type = 'user' then 'Signalement de compte' else 'Ressource signalée' end,
      case when new.target_type = 'user' then 'Yo rapòte yon kont' else 'Yo rapòte yon resous' end,
      new.reason,
      new.reason,
      '/admin/reports',
      'content-report-' || new.id::text,
      'content_report',
      new.id
    )
    from (
      select distinct ur.user_id
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role = 'admin' and p.is_active
    ) admins;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status
    and new.status in ('resolved', 'dismissed') then
    perform private.insert_notification(
      new.reporter_id,
      'moderation',
      'Votre signalement a été examiné',
      'Yo egzamine rapò ou a',
      coalesce(nullif(btrim(new.admin_note), ''), 'Merci de nous avoir aidés à maintenir EXAMPRO.'),
      coalesce(nullif(btrim(new.admin_note), ''), 'Mèsi paske w ede nou kenbe EXAMPRO an sekirite.'),
      '/notifications',
      'content-report-reviewed-' || new.id::text || '-' || new.status,
      'content_report',
      new.id
    );
  end if;
  return new;
end
$$;

revoke all on function private.notify_content_report_events() from public, anon, authenticated;
create trigger notify_content_report_events
  after insert or update of status on public.content_reports
  for each row execute function private.notify_content_report_events();
