
create type public.app_role as enum ('admin','teacher','student','reviewer');
create type public.content_status as enum ('draft','published','archived');

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null, name_ht text not null,
  requires_track boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  code text not null,
  name_fr text not null, name_ht text not null,
  sort_order int not null default 0,
  unique(level_id, code)
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null, name_ht text not null,
  icon text,
  created_at timestamptz not null default now()
);
create table public.level_subjects (
  level_id uuid not null references public.levels(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  verified boolean not null default false,
  primary key(level_id, subject_id)
);
create table public.track_subjects (
  track_id uuid not null references public.tracks(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key(track_id, subject_id)
);
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  level_id uuid not null references public.levels(id) on delete cascade,
  name_fr text not null, name_ht text not null,
  verified boolean not null default false,
  sort_order int not null default 0
);
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name_fr text not null, name_ht text not null,
  sort_order int not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  language text not null default 'fr' check (language in ('fr','ht')),
  level_id uuid references public.levels(id),
  track_id uuid references public.tracks(id),
  school text,
  department text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.teacher_subjects (
  teacher_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key(teacher_id, subject_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null check (char_length(title) between 3 and 200),
  summary text,
  body text not null default '',
  language text not null default 'fr',
  level_id uuid not null references public.levels(id),
  track_id uuid references public.tracks(id),
  subject_id uuid not null references public.subjects(id),
  chapter_id uuid references public.chapters(id),
  topic_id uuid references public.topics(id),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  title text not null check (char_length(title) between 3 and 200),
  description text,
  exam_year int not null check (exam_year between 1950 and 2100),
  session text,
  level_id uuid not null references public.levels(id),
  track_id uuid references public.tracks(id),
  subject_id uuid not null references public.subjects(id),
  file_path text not null,
  file_name text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.levels, public.tracks, public.subjects, public.level_subjects, public.track_subjects, public.chapters, public.topics to anon, authenticated;
grant insert, update, delete on public.levels, public.tracks, public.subjects, public.level_subjects, public.track_subjects, public.chapters, public.topics to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, delete on public.teacher_subjects to authenticated;
grant select, insert, update, delete on public.courses, public.exams to authenticated;
grant all on public.levels, public.tracks, public.subjects, public.level_subjects, public.track_subjects, public.chapters, public.topics, public.profiles, public.user_roles, public.teacher_subjects, public.courses, public.exams to service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

alter table public.levels enable row level security;
alter table public.tracks enable row level security;
alter table public.subjects enable row level security;
alter table public.level_subjects enable row level security;
alter table public.track_subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.courses enable row level security;
alter table public.exams enable row level security;

do $$ declare t text; begin
  foreach t in array array['levels','tracks','subjects','level_subjects','track_subjects','chapters','topics'] loop
    execute format('create policy "Catalog readable" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "Admins manage catalog" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create policy "Own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "Teacher subjects read" on public.teacher_subjects for select to authenticated using (teacher_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Teacher subjects insert" on public.teacher_subjects for insert to authenticated with check (teacher_id = auth.uid() and public.has_role(auth.uid(),'teacher'));
create policy "Teacher subjects delete" on public.teacher_subjects for delete to authenticated using (teacher_id = auth.uid());

create policy "Courses read" on public.courses for select to authenticated
  using (status = 'published' or author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Courses insert" on public.courses for insert to authenticated
  with check (author_id = auth.uid() and public.has_role(auth.uid(),'teacher'));
create policy "Courses update" on public.courses for update to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Courses delete" on public.courses for delete to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "Exams read" on public.exams for select to authenticated
  using (status = 'published' or author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Exams insert" on public.exams for insert to authenticated
  with check (author_id = auth.uid() and public.has_role(auth.uid(),'teacher') and file_path like auth.uid()::text || '/%');
create policy "Exams update" on public.exams for update to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Exams delete" on public.exams for delete to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.validate_classification()
returns trigger language plpgsql set search_path = public as $$
declare req boolean;
begin
  if new.level_id is null then return new; end if;
  select requires_track into req from public.levels where id = new.level_id;
  if TG_TABLE_NAME = 'profiles' then
    if req and new.track_id is null and new.onboarded then raise exception 'TRACK_REQUIRED'; end if;
  end if;
  if not req then new.track_id := null; end if;
  if new.track_id is not null and not exists (select 1 from public.tracks where id = new.track_id and level_id = new.level_id) then
    raise exception 'TRACK_LEVEL_MISMATCH';
  end if;
  if TG_TABLE_NAME in ('courses','exams') then
    if not exists (select 1 from public.level_subjects where level_id = new.level_id and subject_id = new.subject_id) then
      raise exception 'SUBJECT_NOT_IN_LEVEL';
    end if;
    if new.track_id is not null and not exists (select 1 from public.track_subjects where track_id = new.track_id and subject_id = new.subject_id) then
      raise exception 'SUBJECT_NOT_IN_TRACK';
    end if;
    if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
    new.updated_at := now();
  end if;
  if TG_TABLE_NAME = 'courses' then
    if new.chapter_id is not null and not exists (select 1 from public.chapters where id = new.chapter_id and subject_id = new.subject_id and level_id = new.level_id) then
      raise exception 'CHAPTER_MISMATCH';
    end if;
    if new.topic_id is not null and (new.chapter_id is null or not exists (select 1 from public.topics where id = new.topic_id and chapter_id = new.chapter_id)) then
      raise exception 'TOPIC_MISMATCH';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_class before insert or update on public.profiles for each row execute function public.validate_classification();
create trigger trg_courses_class before insert or update on public.courses for each row execute function public.validate_classification();
create trigger trg_exams_class before insert or update on public.exams for each row execute function public.validate_classification();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, language)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          case when new.raw_user_meta_data->>'language' = 'ht' then 'ht' else 'fr' end);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.complete_onboarding(
  _role public.app_role, _full_name text, _level_id uuid, _track_id uuid, _subject_ids uuid[], _school text, _department text
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); req boolean;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _role not in ('student','teacher') then raise exception 'INVALID_ROLE'; end if;
  if exists (select 1 from public.user_roles where user_id = uid and role in ('student','teacher')) then
    raise exception 'ALREADY_ONBOARDED';
  end if;
  if coalesce(trim(_full_name),'') = '' then raise exception 'NAME_REQUIRED'; end if;
  if _role = 'student' then
    if _level_id is null then raise exception 'LEVEL_REQUIRED'; end if;
    select requires_track into req from public.levels where id = _level_id;
    if req and _track_id is null then raise exception 'TRACK_REQUIRED'; end if;
  else
    if _subject_ids is null or array_length(_subject_ids,1) is null then raise exception 'SUBJECTS_REQUIRED'; end if;
  end if;
  insert into public.user_roles(user_id, role) values (uid, _role);
  update public.profiles set full_name = trim(_full_name),
    level_id = case when _role='student' then _level_id else null end,
    track_id = case when _role='student' then _track_id else null end,
    school = nullif(trim(coalesce(_school,'')),''), department = nullif(trim(coalesce(_department,'')),''),
    onboarded = true, updated_at = now()
  where id = uid;
  if _role = 'teacher' then
    insert into public.teacher_subjects(teacher_id, subject_id) select uid, unnest(_subject_ids) on conflict do nothing;
  end if;
end $$;
revoke execute on function public.complete_onboarding from public, anon;
grant execute on function public.complete_onboarding to authenticated;

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role, _enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if _enabled then insert into public.user_roles(user_id, role) values (_user_id,_role) on conflict do nothing;
  else
    if _user_id = auth.uid() and _role = 'admin' then raise exception 'CANNOT_REMOVE_SELF_ADMIN'; end if;
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;
end $$;
revoke execute on function public.admin_set_role from public, anon;
grant execute on function public.admin_set_role to authenticated;

-- Storage: teachers upload into their own folder; readers see own, admin, or published exam files
create policy "Exam files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'exams' and (storage.foldername(name))[1] = auth.uid()::text and public.has_role(auth.uid(),'teacher'));
create policy "Exam files read" on storage.objects for select to authenticated
  using (bucket_id = 'exams' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.exams e where e.file_path = storage.objects.name and e.status = 'published')
  ));
create policy "Exam files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'exams' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

-- ===== Starter catalog =====
insert into public.levels (slug, name_fr, name_ht, requires_track, sort_order) values
 ('9e-af','9e année fondamentale','9e ane fondamantal', false, 1),
 ('terminale','Terminale','Tèminal (Filo)', true, 2);

insert into public.tracks (level_id, code, name_fr, name_ht, sort_order)
select l.id, t.code, t.fr, t.ht, t.o from public.levels l,
 (values ('SMP','Sciences mathématiques et physiques','Syans matematik ak fizik',1),
         ('SVT','Sciences de la vie et de la Terre','Syans lavi ak latè',2),
         ('LLA','Langues, lettres et arts','Lang, lèt ak la',3),
         ('SES','Sciences économiques et sociales','Syans ekonomik ak sosyal',4)) t(code,fr,ht,o)
where l.slug='terminale';

insert into public.subjects (slug, name_fr, name_ht, icon) values
 ('mathematiques','Mathématiques','Matematik','calculator'),
 ('physique','Physique','Fizik','atom'),
 ('biologie','Biologie','Byoloji','leaf'),
 ('chimie','Chimie','Chimi','flask'),
 ('geologie','Géologie','Jeyoloji','mountain'),
 ('anglais','Anglais','Angle','languages'),
 ('espagnol','Espagnol','Panyòl','languages'),
 ('creole','Créole','Kreyòl','book-open'),
 ('philosophie','Philosophie','Filozofi','brain'),
 ('arts','Arts','La','palette'),
 ('sciences-sociales','Sciences sociales','Syans sosyal','globe'),
 ('economie','Économie','Ekonomi','trending-up'),
 ('francais','Français','Franse','book-open'),
 ('sciences-experimentales','Sciences expérimentales','Syans eksperimantal','flask');

-- Terminale level-subjects (product-defined) + track links
insert into public.level_subjects (level_id, subject_id, verified)
select l.id, s.id, false from public.levels l, public.subjects s
where l.slug='terminale' and s.slug in ('mathematiques','physique','biologie','chimie','geologie','anglais','espagnol','creole','philosophie','arts','sciences-sociales','economie');

insert into public.track_subjects (track_id, subject_id)
select t.id, s.id from public.tracks t join public.levels l on l.id=t.level_id and l.slug='terminale'
join (values ('SMP','mathematiques'),('SMP','physique'),
             ('SVT','biologie'),('SVT','chimie'),('SVT','geologie'),
             ('LLA','anglais'),('LLA','espagnol'),('LLA','creole'),('LLA','philosophie'),('LLA','arts'),
             ('SES','sciences-sociales'),('SES','economie')) m(code,slug) on m.code=t.code
join public.subjects s on s.slug=m.slug;

-- 9e starter subjects (to verify against official curriculum)
insert into public.level_subjects (level_id, subject_id, verified)
select l.id, s.id, false from public.levels l, public.subjects s
where l.slug='9e-af' and s.slug in ('mathematiques','francais','creole','anglais','espagnol','sciences-experimentales','sciences-sociales');

-- Chapters
insert into public.chapters (subject_id, level_id, name_fr, name_ht, sort_order)
select s.id, l.id, c.fr, c.ht, c.o from public.subjects s, public.levels l,
 (values ('Algèbre','Aljèb',1),('Géométrie','Jeyometri',2),('Analyse','Analiz',3),('Statistiques','Estatistik',4),('Probabilités','Pwobabilite',5)) c(fr,ht,o)
where s.slug='mathematiques' and l.slug='terminale';

insert into public.chapters (subject_id, level_id, name_fr, name_ht, sort_order)
select s.id, l.id, c.fr, c.ht, c.o from public.subjects s, public.levels l,
 (values ('Histoire','Istwa',1),('Géographie','Jewografi',2)) c(fr,ht,o)
where s.slug='sciences-sociales' and l.slug in ('terminale','9e-af');

insert into public.chapters (subject_id, level_id, name_fr, name_ht, sort_order)
select s.id, l.id, c.fr, c.ht, c.o from public.subjects s, public.levels l,
 (values ('Mécanique','Mekanik',1),('Électricité','Elektrisite',2),('Optique','Optik',3)) c(fr,ht,o)
where s.slug='physique' and l.slug='terminale';

insert into public.chapters (subject_id, level_id, name_fr, name_ht, sort_order)
select s.id, l.id, c.fr, c.ht, c.o from public.subjects s, public.levels l,
 (values ('Nombres et calculs','Nonb ak kalkil',1),('Géométrie','Jeyometri',2),('Équations','Ekwasyon',3)) c(fr,ht,o)
where s.slug='mathematiques' and l.slug='9e-af';

-- Topics
insert into public.topics (chapter_id, name_fr, name_ht, sort_order)
select c.id, t.fr, t.ht, t.o from public.chapters c join public.levels l on l.id=c.level_id and l.slug='terminale'
join public.subjects s on s.id=c.subject_id and s.slug='mathematiques'
join (values ('Analyse','Limites','Limit',1),('Analyse','Dérivées','Derive',2),('Analyse','Intégrales','Entegral',3),
             ('Algèbre','Nombres complexes','Nonb konplèks',1),('Algèbre','Suites numériques','Siksesyon nimerik',2),
             ('Probabilités','Dénombrement','Denonbreman',1),('Probabilités','Lois de probabilité','Lwa pwobabilite',2)) t(ch,fr,ht,o)
on t.ch = c.name_fr;

insert into public.topics (chapter_id, name_fr, name_ht, sort_order)
select c.id, t.fr, t.ht, t.o from public.chapters c join public.levels l on l.id=c.level_id and l.slug='9e-af'
join public.subjects s on s.id=c.subject_id and s.slug='mathematiques'
join (values ('Nombres et calculs','Fractions','Fraksyon',1),('Nombres et calculs','Puissances','Pisans',2),
             ('Géométrie','Théorème de Pythagore','Teyorèm Pitagò',1),('Géométrie','Théorème de Thalès','Teyorèm Talès',2),
             ('Équations','Équations du premier degré','Ekwasyon premye degre',1)) t(ch,fr,ht,o)
on t.ch = c.name_fr;
