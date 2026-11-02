alter table public.courses
  add column if not exists is_demo boolean not null default false;

alter table public.exams
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_content text;

create table if not exists public.demo_student_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('favorite', 'evaluation', 'progress')),
  title text not null,
  description text not null,
  level_id uuid not null references public.levels(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  score numeric(5,2),
  occurred_at timestamptz not null default now(),
  constraint demo_student_records_resource_check check (
    (record_type = 'favorite' and course_id is not null and exam_id is null and score is null)
    or (record_type = 'progress' and course_id is not null and exam_id is null and score is null)
    or (record_type = 'evaluation' and exam_id is not null and course_id is null and score between 0 and 100)
  )
);

alter table public.demo_student_records enable row level security;
grant select on public.demo_student_records to authenticated;

create policy "Students read matching demo records"
  on public.demo_student_records for select to authenticated
  using (
    private.has_role('admin')
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.level_id = demo_student_records.level_id
        and (demo_student_records.track_id is null or p.track_id = demo_student_records.track_id)
    )
  );

create or replace function public.admin_seed_demo_content()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_author uuid;
  target record;
  subject_name text;
  track_code text;
  course_id uuid;
  exam_id uuid;
  created_count integer := 0;
begin
  if auth.uid() is not null and not private.has_role('admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if exists (select 1 from public.courses where is_demo)
    or exists (select 1 from public.exams where is_demo) then
    return jsonb_build_object('created', false, 'reason', 'already_exists');
  end if;

  select ur.user_id into demo_author
  from public.user_roles ur
  where ur.role = 'admin'
  order by ur.user_id
  limit 1;

  if demo_author is null then
    demo_author := '00000000-0000-0000-0000-000000000001'::uuid;
  end if;

  for target in
    select ls.level_id, ls.subject_id, null::uuid as track_id
    from public.level_subjects ls
    where not exists (
      select 1
      from public.track_subjects ts
      join public.tracks tr on tr.id = ts.track_id
      where tr.level_id = ls.level_id
        and ts.subject_id = ls.subject_id
    )
    union
    select tr.level_id, ts.subject_id, tr.id as track_id
    from public.track_subjects ts
    join public.tracks tr on tr.id = ts.track_id
  loop
    select s.name_fr into subject_name
    from public.subjects s
    where s.id = target.subject_id;

    select tr.code into track_code
    from public.tracks tr
    where tr.id = target.track_id;

    insert into public.courses (
      author_id, title, summary, body, language, level_id, track_id, subject_id,
      status, published_at, is_demo
    ) values (
      demo_author,
      'Cours de démonstration — ' || subject_name || coalesce(' · ' || track_code, ''),
      'Contenu exemple EXAMPRO, à remplacer par un cours vérifié.',
      'CONTENU DE DÉMONSTRATION' || E'\n\n'
        || 'Cette fiche montre la présentation d’un cours dans EXAMPRO. '
        || 'Elle ne constitue pas un contenu pédagogique vérifié.' || E'\n\n'
        || 'Notions à réviser : ' || subject_name || '.' || E'\n'
        || 'Objectif : organiser les définitions, méthodes et exemples du chapitre.',
      'fr',
      target.level_id,
      target.track_id,
      target.subject_id,
      'published',
      now(),
      true
    )
    returning id into course_id;

    insert into public.exams (
      author_id, title, description, exam_year, session, level_id, track_id, subject_id,
      file_path, file_name, status, published_at, is_demo, demo_content
    ) values (
      demo_author,
      'Épreuve de démonstration — ' || subject_name || coalesce(' · ' || track_code, ''),
      'Épreuve fictive de démonstration, à remplacer par un examen vérifié.',
      extract(year from now())::integer,
      'Démonstration',
      target.level_id,
      target.track_id,
      target.subject_id,
      'demo:',
      'epreuve-demo.txt',
      'published',
      now(),
      true,
      'ÉPREUVE DE DÉMONSTRATION' || E'\n\n'
        || 'Cette page est un exemple d’affichage. Elle ne contient pas une épreuve officielle.' || E'\n\n'
        || 'Matière : ' || subject_name || E'\n'
        || 'Question 1 — Présentez une notion importante étudiée dans cette matière.' || E'\n'
        || 'Question 2 — Décrivez une méthode de résolution et illustrez-la.' || E'\n'
        || 'Question 3 — Expliquez comment vérifier votre réponse.'
    )
    returning id into exam_id;

    insert into public.demo_student_records (
      record_type, title, description, level_id, track_id, subject_id, course_id, occurred_at
    ) values
      (
        'favorite',
        'Cours de démonstration — ' || subject_name,
        'Élément enregistré dans les favoris pour présenter cette page.',
        target.level_id,
        target.track_id,
        target.subject_id,
        course_id,
        now() - interval '1 day'
      ),
      (
        'progress',
        'Cours consulté — ' || subject_name,
        'Activité fictive destinée à illustrer la page de progression.',
        target.level_id,
        target.track_id,
        target.subject_id,
        course_id,
        now() - interval '2 days'
      );

    insert into public.demo_student_records (
      record_type, title, description, level_id, track_id, subject_id, exam_id, score, occurred_at
    ) values (
      'evaluation',
      'Évaluation de démonstration — ' || subject_name,
      'Résultat fictif : ne représente pas une note réelle.',
      target.level_id,
      target.track_id,
      target.subject_id,
      exam_id,
      84,
      now() - interval '3 days'
    );

    created_count := created_count + 1;
  end loop;

  return jsonb_build_object('created', true, 'catalog_assignments', created_count);
end;
$$;

create or replace function public.admin_delete_demo_content()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_courses integer;
  deleted_exams integer;
  deleted_records integer;
begin
  if not private.has_role('admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  delete from public.demo_student_records;
  get diagnostics deleted_records = row_count;

  delete from public.courses where is_demo;
  get diagnostics deleted_courses = row_count;

  delete from public.exams where is_demo;
  get diagnostics deleted_exams = row_count;

  return jsonb_build_object(
    'deleted_courses', deleted_courses,
    'deleted_exams', deleted_exams,
    'deleted_records', deleted_records
  );
end;
$$;

revoke all on function public.admin_seed_demo_content() from public;
revoke all on function public.admin_delete_demo_content() from public;
grant execute on function public.admin_seed_demo_content() to authenticated;
grant execute on function public.admin_delete_demo_content() to authenticated;

select public.admin_seed_demo_content();
