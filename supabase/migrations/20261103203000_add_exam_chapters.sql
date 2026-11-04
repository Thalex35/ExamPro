alter table public.exams
  add column chapter_id uuid references public.chapters(id) on delete set null;

create index exams_chapter_id_idx on public.exams(chapter_id);

create or replace function public.validate_exam_chapter()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.chapter_id is not null and not exists (
    select 1
    from public.chapters
    where id = new.chapter_id
      and subject_id = new.subject_id
      and level_id = new.level_id
  ) then
    raise exception 'CHAPTER_MISMATCH';
  end if;
  return new;
end $$;

create trigger trg_exams_chapter
before insert or update of chapter_id, subject_id, level_id on public.exams
for each row execute function public.validate_exam_chapter();
