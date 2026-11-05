alter table public.courses
  add column description text,
  add column learning_objectives text[] not null default '{}',
  add column skills text[] not null default '{}',
  add column prerequisites text[] not null default '{}',
  add column duration_minutes integer,
  add column difficulty text,
  add column preview text;

alter table public.courses
  add constraint courses_pedagogy_duration_check
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  add constraint courses_pedagogy_difficulty_check
    check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced'));

create or replace function private.validate_course_pedagogy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  description_words integer;
begin
  if tg_op = 'UPDATE' and old.status = 'published'
    and old.description is null and old.duration_minutes is null
    and new.description is null and new.duration_minutes is null then
    return new;
  end if;

  description_words := case
    when nullif(btrim(coalesce(new.description, '')), '') is null then 0
    else cardinality(regexp_split_to_array(btrim(new.description), '\s+'))
  end;

  if description_words < 80 or description_words > 250 then
    raise exception 'COURSE_DESCRIPTION_WORD_COUNT';
  end if;
  if cardinality(new.learning_objectives) < 1
    or cardinality(new.skills) < 1
    or new.duration_minutes is null
    or new.difficulty is null
    or nullif(btrim(coalesce(new.preview, '')), '') is null then
    raise exception 'COURSE_PEDAGOGY_REQUIRED';
  end if;
  if exists (
    select 1
    from unnest(new.learning_objectives || new.skills || new.prerequisites) as entry(value)
    where nullif(btrim(entry.value), '') is null
  ) then
    raise exception 'COURSE_PEDAGOGY_REQUIRED';
  end if;

  return new;
end
$$;

revoke all on function private.validate_course_pedagogy() from public, anon, authenticated;
drop trigger if exists validate_course_pedagogy on public.courses;
create trigger validate_course_pedagogy
before insert or update of description, learning_objectives, skills, prerequisites, duration_minutes, difficulty, preview, status
on public.courses
for each row execute function private.validate_course_pedagogy();
