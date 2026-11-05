alter table public.courses
  add column if not exists review_note text;

alter table public.exams
  add column if not exists review_note text;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (
    category in (
      'course',
      'exam',
      'chapter_resource',
      'quiz',
      'quiz_result',
      'announcement',
      'teacher_verification',
      'moderation',
      'admin_review'
    )
  ),
  title_fr text not null,
  title_ht text not null,
  body_fr text not null,
  body_ht text not null,
  href text not null check (href like '/%' and href not like '//%'),
  reference_type text,
  reference_id uuid,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, dedupe_key)
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid() and private.is_active_user());

create policy "Users mark own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid() and private.is_active_user())
  with check (
    recipient_id = auth.uid()
    and private.is_active_user()
    and read_at is not null
  );

create or replace function private.insert_notification(
  _recipient_id uuid,
  _category text,
  _title_fr text,
  _title_ht text,
  _body_fr text,
  _body_ht text,
  _href text,
  _dedupe_key text,
  _reference_type text default null,
  _reference_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (
    recipient_id,
    category,
    title_fr,
    title_ht,
    body_fr,
    body_ht,
    href,
    dedupe_key,
    reference_type,
    reference_id
  )
  values (
    _recipient_id,
    _category,
    _title_fr,
    _title_ht,
    _body_fr,
    _body_ht,
    _href,
    _dedupe_key,
    _reference_type,
    _reference_id
  )
  on conflict (recipient_id, dedupe_key) do nothing;
$$;

revoke all on function private.insert_notification(
  uuid, text, text, text, text, text, text, text, text, uuid
) from public, anon, authenticated;

create or replace function private.notify_resource_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource_kind text := case when tg_table_name = 'courses' then 'course' else 'exam' end;
  admin_href text := case when tg_table_name = 'courses' then '/admin/courses' else '/admin/exams' end;
  teacher_href text := case when tg_table_name = 'courses'
    then '/teacher/courses/' || new.id::text
    else '/teacher/exams/' || new.id::text
  end;
  student_href text;
  resource_title text := new.title;
  is_teacher_author boolean;
begin
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = new.author_id
      and ur.role = 'teacher'
  ) into is_teacher_author;

  student_href := '/subjects/' || new.subject_id::text ||
    '?resource=' || case when resource_kind = 'course' then 'courses' else 'exams' end ||
    case when new.chapter_id is null then '' else '&chapter=' || new.chapter_id::text end;

  if tg_op = 'INSERT' and is_teacher_author then
    perform private.insert_notification(
      admins.user_id,
      'admin_review',
      case when resource_kind = 'course' then 'Nouveau cours à examiner' else 'Nouvel examen à examiner' end,
      case when resource_kind = 'course' then 'Nouvo kou pou verifye' else 'Nouvo egzamen pou verifye' end,
      resource_title,
      resource_title,
      admin_href,
      resource_kind || '-submitted-' || new.id::text,
      resource_kind,
      new.id
    )
    from (
      select distinct ur.user_id
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role = 'admin' and p.is_active
    ) admins;
  end if;

  if tg_op = 'UPDATE'
    and new.review_status = 'rejected'
    and old.review_status is distinct from 'rejected' then
    perform private.insert_notification(
      new.author_id,
      'moderation',
      case when resource_kind = 'course' then 'Cours à corriger' else 'Examen à corriger' end,
      case when resource_kind = 'course' then 'Kou a bezwen koreksyon' else 'Egzamen an bezwen koreksyon' end,
      coalesce(nullif(btrim(new.review_note), ''), 'Votre ressource a été refusée. Ouvrez-la pour la modifier.'),
      coalesce(nullif(btrim(new.review_note), ''), 'Yo refize resous ou a. Louvri li pou modifye l.'),
      teacher_href,
      resource_kind || '-rejected-' || new.id::text || '-' || coalesce(new.updated_at::text, now()::text),
      resource_kind,
      new.id
    );
  end if;

  if new.status = 'published'
    and new.review_status <> 'rejected'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from 'published'
    ) then
    perform private.insert_notification(
      new.author_id,
      'moderation',
      case when resource_kind = 'course' then 'Votre cours est publié' else 'Votre examen est publié' end,
      case when resource_kind = 'course' then 'Kou ou a pibliye' else 'Egzamen ou a pibliye' end,
      resource_title,
      resource_title,
      teacher_href,
      resource_kind || '-published-author-' || new.id::text || '-' || coalesce(new.published_at::text, now()::text),
      resource_kind,
      new.id
    );

    perform private.insert_notification(
      students.user_id,
      case
        when new.chapter_id is not null then 'chapter_resource'
        when resource_kind = 'course' then 'course'
        else 'exam'
      end,
      case
        when new.chapter_id is not null then 'Nouvelle ressource dans votre chapitre'
        when resource_kind = 'course' then 'Nouveau cours disponible'
        else 'Nouvel examen disponible'
      end,
      case
        when new.chapter_id is not null then 'Nouvo resous nan chapit ou'
        when resource_kind = 'course' then 'Nouvo kou disponib'
        else 'Nouvo egzamen disponib'
      end,
      resource_title,
      resource_title,
      case when resource_kind = 'course' then '/courses/' || new.id::text else student_href end,
      resource_kind || '-published-student-' || new.id::text || '-' || coalesce(new.published_at::text, now()::text),
      resource_kind,
      new.id
    )
    from (
      select distinct p.id as user_id
      from public.profiles p
      join public.user_roles ur on ur.user_id = p.id and ur.role = 'student'
      where p.is_active
        and p.onboarded
        and p.level_id = new.level_id
        and (new.track_id is null or p.track_id = new.track_id)
    ) students;
  end if;

  return new;
end
$$;

revoke all on function private.notify_resource_events() from public, anon, authenticated;

create trigger notify_course_events
  after insert or update of status, review_status on public.courses
  for each row execute function private.notify_resource_events();

create trigger notify_exam_events
  after insert or update of status, review_status on public.exams
  for each row execute function private.notify_resource_events();

create or replace function private.notify_teacher_verification_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.insert_notification(
      admins.user_id,
      'admin_review',
      'Nouvelle demande de vérification',
      'Nouvo demann verifikasyon',
      'Une demande de vérification de professeur attend votre examen.',
      'Gen yon demann verifikasyon pwofesè k ap tann revizyon ou.',
      '/admin/users',
      'teacher-verification-submitted-' || new.id::text,
      'teacher_verification',
      new.id
    )
    from (
      select distinct ur.user_id
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role = 'admin' and p.is_active
    ) admins;
  elsif tg_op = 'UPDATE' and new.status in ('approved', 'rejected')
    and old.status is distinct from new.status then
    perform private.insert_notification(
      new.teacher_id,
      case when new.status = 'approved' then 'teacher_verification' else 'moderation' end,
      case when new.status = 'approved' then 'Compte professeur vérifié' else 'Vérification refusée' end,
      case when new.status = 'approved' then 'Kont pwofesè a verifye' else 'Yo refize verifikasyon an' end,
      coalesce(nullif(btrim(new.review_note), ''), 'La vérification de votre compte est terminée.'),
      coalesce(nullif(btrim(new.review_note), ''), 'Verifikasyon kont ou a fini.'),
      '/teacher',
      'teacher-verification-' || new.status || '-' || new.id::text,
      'teacher_verification',
      new.id
    );
  end if;
  return new;
end
$$;

revoke all on function private.notify_teacher_verification_events() from public, anon, authenticated;

create trigger notify_teacher_verification_events
  after insert or update of status on public.teacher_verification_requests
  for each row execute function private.notify_teacher_verification_events();

create or replace function public.admin_send_announcement(
  _title_fr text,
  _title_ht text,
  _body_fr text,
  _body_ht text,
  _audience text,
  _level_id uuid default null,
  _track_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  announcement_id uuid := gen_random_uuid();
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _audience is null or _audience not in ('students', 'teachers', 'all') then
    raise exception 'INVALID_AUDIENCE';
  end if;
  if length(btrim(coalesce(_title_fr, ''))) not between 1 and 120
    or length(btrim(coalesce(_title_ht, ''))) not between 1 and 120
    or length(btrim(coalesce(_body_fr, ''))) not between 1 and 1000
    or length(btrim(coalesce(_body_ht, ''))) not between 1 and 1000 then
    raise exception 'INVALID_ANNOUNCEMENT';
  end if;
  if _audience <> 'students' and (_level_id is not null or _track_id is not null) then
    raise exception 'INVALID_AUDIENCE_SCOPE';
  end if;
  if _track_id is not null and not exists (
    select 1 from public.tracks where id = _track_id and level_id = _level_id
  ) then raise exception 'INVALID_TRACK'; end if;

  insert into public.notifications (
    recipient_id, category, title_fr, title_ht, body_fr, body_ht,
    href, dedupe_key, reference_type, reference_id
  )
  select distinct
    p.id,
    'announcement',
    btrim(_title_fr),
    btrim(_title_ht),
    btrim(_body_fr),
    btrim(_body_ht),
    '/notifications',
    'announcement-' || announcement_id::text,
    'announcement',
    announcement_id
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where p.is_active
    and (
      _audience = 'all'
      or (_audience = 'students' and ur.role = 'student')
      or (_audience = 'teachers' and ur.role = 'teacher')
    )
    and (
      _audience <> 'students'
      or (
        p.onboarded
        and (_level_id is null or p.level_id = _level_id)
        and (_track_id is null or p.track_id = _track_id)
      )
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end
$$;

revoke all on function public.admin_send_announcement(text, text, text, text, text, uuid, uuid)
  from public, anon;
grant execute on function public.admin_send_announcement(text, text, text, text, text, uuid, uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
