alter table public.courses
  add column resource_formats text[] not null default array['text']::text[],
  add column file_size bigint;

alter table public.course_resources
  add column description text,
  add column duration_minutes integer,
  add column file_size bigint;

update public.courses c
set resource_formats = coalesce((
  select array_agg(formats.resource_type order by formats.resource_type)
  from (
    select c.resource_type
    where c.resource_type in ('text', 'document', 'video', 'external_link')
    union
    select r.resource_type
    from public.course_resources r
    where r.course_id = c.id
  ) as formats
), array['text']::text[]);

alter table public.courses
  add constraint courses_resource_formats_check
  check (
    cardinality(resource_formats) > 0
    and resource_formats <@ array['text', 'document', 'video', 'external_link']::text[]
  ),
  add constraint courses_file_size_check
  check (file_size is null or file_size >= 0);

alter table public.course_resources
  add constraint course_resources_duration_check
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  add constraint course_resources_file_size_check
    check (file_size is null or file_size >= 0);
