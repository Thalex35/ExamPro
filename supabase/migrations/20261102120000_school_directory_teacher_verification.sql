alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column school_id uuid,
  add column teacher_verification_status text not null default 'not_applicable',
  add column teacher_verification_note text;

update public.profiles
set first_name = nullif(split_part(btrim(full_name), ' ', 1), ''),
    last_name = nullif(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
where full_name is not null;

alter table public.profiles
  add constraint profiles_teacher_verification_status_check
  check (teacher_verification_status in ('not_applicable', 'pending', 'approved', 'rejected'));

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 200),
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  ) stored,
  geographical_department text not null check (geographical_department in (
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  )),
  phone text,
  email text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (geographical_department, normalized_name),
  check (phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,23}$'),
  check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

alter table public.profiles
  add constraint profiles_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete set null;

create index schools_department_status_name_idx
  on public.schools (geographical_department, verification_status, normalized_name);

create table public.school_contact_corrections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  proposed_phone text,
  proposed_email text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (proposed_phone is not null or proposed_email is not null),
  check (proposed_phone is null or proposed_phone ~ '^\+?[0-9][0-9 ()-]{6,23}$'),
  check (proposed_email is null or proposed_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create unique index school_contact_corrections_pending_unique
  on public.school_contact_corrections (school_id, submitted_by)
  where status = 'pending';

create table public.teacher_verification_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  school_id uuid references public.schools(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create unique index teacher_verification_requests_pending_unique
  on public.teacher_verification_requests (teacher_id)
  where status = 'pending';

update public.profiles p
set teacher_verification_status = case
  when p.onboarded then 'approved'
  else 'pending'
end
where exists (
  select 1 from public.user_roles r
  where r.user_id = p.id and r.role = 'teacher'
);

alter table public.schools enable row level security;
alter table public.school_contact_corrections enable row level security;
alter table public.teacher_verification_requests enable row level security;

revoke all on public.schools from anon, authenticated;
grant select on public.schools to authenticated;
revoke all on public.school_contact_corrections from anon, authenticated;
grant select on public.school_contact_corrections to authenticated;
revoke all on public.teacher_verification_requests from anon, authenticated;
grant select on public.teacher_verification_requests to authenticated;
grant all on public.schools, public.school_contact_corrections,
  public.teacher_verification_requests to service_role;

create policy "Schools visible to verified users, submitter, and admins"
  on public.schools for select to authenticated
  using (
    verification_status = 'verified'
    or submitted_by = auth.uid()
    or private.has_role('admin')
  );

create policy "School contact corrections visible to submitter and admins"
  on public.school_contact_corrections for select to authenticated
  using (submitted_by = auth.uid() or private.has_role('admin'));

create policy "Teacher verification requests visible to teacher and admins"
  on public.teacher_verification_requests for select to authenticated
  using (teacher_id = auth.uid() or private.has_role('admin'));

create or replace function private.is_teacher_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.teacher_verification_status = 'approved'
  )
$$;

revoke all on function private.is_teacher_verified() from public, anon;
grant execute on function private.is_teacher_verified() to authenticated;

create or replace function public.save_onboarding_names(_first_name text, _last_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  first_value text := btrim(coalesce(_first_name, ''));
  last_value text := btrim(coalesce(_last_name, ''));
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(first_value) not between 1 and 80
    or char_length(last_value) not between 1 and 80 then
    raise exception 'NAME_REQUIRED';
  end if;
  if char_length(first_value || ' ' || last_value) > 120 then
    raise exception 'NAME_INVALID';
  end if;
  if private.has_role('admin') then raise exception 'ROLE_NOT_ALLOWED'; end if;

  update public.profiles
  set first_name = first_value,
      last_name = last_value,
      full_name = first_value || ' ' || last_value,
      onboarded = false,
      updated_at = now()
  where id = uid
    and (
      not onboarded
      or not exists (
        select 1 from public.user_roles
        where user_id = uid and role in ('student', 'teacher')
      )
    );
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

revoke all on function public.save_onboarding_names(text, text) from public, anon;
grant execute on function public.save_onboarding_names(text, text) to authenticated;

create or replace function public.register_onboarding_school(_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  department text;
  school_id uuid;
  school_status text;
  school_submitter uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (private.has_role('teacher') or private.has_role('student')) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  if char_length(btrim(coalesce(_name, ''))) not between 2 and 200 then
    raise exception 'SCHOOL_REQUIRED';
  end if;

  select geographical_department into department
  from public.profiles
  where id = uid and not onboarded;
  if not found or department is null then raise exception 'DEPARTMENT_REQUIRED'; end if;

  insert into public.schools (name, geographical_department, submitted_by)
  values (btrim(_name), department, uid)
  on conflict (geographical_department, normalized_name) do nothing;

  select id, verification_status, submitted_by
  into school_id, school_status, school_submitter
  from public.schools
  where geographical_department = department
    and normalized_name = lower(regexp_replace(btrim(_name), '\s+', ' ', 'g'));

  if school_status = 'rejected' then raise exception 'SCHOOL_REJECTED'; end if;
  if school_status = 'pending' and school_submitter is distinct from uid then
    raise exception 'SCHOOL_PENDING_REVIEW';
  end if;
  return school_id;
end
$$;

revoke all on function public.register_onboarding_school(text) from public, anon;
grant execute on function public.register_onboarding_school(text) to authenticated;

create or replace function public.save_onboarding_school(_school_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  school_row public.schools%rowtype;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (private.has_role('teacher') or private.has_role('student')) then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  select * into school_row from public.schools where id = _school_id;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if school_row.verification_status <> 'verified'
    and not (school_row.verification_status = 'pending' and school_row.submitted_by = uid) then
    raise exception 'SCHOOL_NOT_AVAILABLE';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = uid and not onboarded
      and geographical_department = school_row.geographical_department
  ) then raise exception 'SCHOOL_DEPARTMENT_MISMATCH'; end if;

  update public.profiles
  set school_id = school_row.id, school = school_row.name, updated_at = now()
  where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

revoke all on function public.save_onboarding_school(uuid) from public, anon;
grant execute on function public.save_onboarding_school(uuid) to authenticated;

create or replace function public.save_teacher_school_contacts(_phone text, _email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  school_row public.schools%rowtype;
  phone_value text := nullif(btrim(coalesce(_phone, '')), '');
  email_value text := nullif(lower(btrim(coalesce(_email, ''))), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if phone_value is not null and phone_value !~ '^\+?[0-9][0-9 ()-]{6,23}$' then
    raise exception 'SCHOOL_PHONE_INVALID';
  end if;
  if email_value is not null and email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'SCHOOL_EMAIL_INVALID';
  end if;

  select s.* into school_row
  from public.schools s
  join public.profiles p on p.school_id = s.id
  where p.id = uid and not p.onboarded;
  if not found then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;

  if school_row.verification_status = 'pending' and school_row.submitted_by = uid then
    update public.schools
    set phone = coalesce(phone_value, phone),
        email = coalesce(email_value, email),
        updated_at = now()
    where id = school_row.id;
  elsif school_row.verification_status = 'verified' then
    if phone_value is not null and phone_value is distinct from school_row.phone
      or email_value is not null and email_value is distinct from school_row.email then
      insert into public.school_contact_corrections (
        school_id, submitted_by, proposed_phone, proposed_email
      )
      values (school_row.id, uid, phone_value, email_value)
      on conflict (school_id, submitted_by) where status = 'pending'
      do update set
        proposed_phone = coalesce(excluded.proposed_phone, public.school_contact_corrections.proposed_phone),
        proposed_email = coalesce(excluded.proposed_email, public.school_contact_corrections.proposed_email),
        created_at = now();
    end if;
  else
    raise exception 'SCHOOL_NOT_AVAILABLE';
  end if;
end
$$;

revoke all on function public.save_teacher_school_contacts(text, text) from public, anon;
grant execute on function public.save_teacher_school_contacts(text, text) to authenticated;

create or replace function public.finish_teacher_onboarding(_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  teacher_profile public.profiles%rowtype;
  school_status text;
  school_submitter uuid;
  user_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if btrim(coalesce(_phone, '')) !~ '^[+][1-9][0-9]{7,14}$' then
    raise exception 'PHONE_INVALID';
  end if;

  select * into teacher_profile
  from public.profiles where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if char_length(btrim(coalesce(teacher_profile.full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if not coalesce(teacher_profile.geographical_department = any(array[
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  ]), false) then
    raise exception 'DEPARTMENT_REQUIRED';
  end if;
  if teacher_profile.school_id is null then raise exception 'SCHOOL_REQUIRED'; end if;
  select verification_status, submitted_by into school_status, school_submitter
  from public.schools where id = teacher_profile.school_id;
  if school_status is null or (
    school_status <> 'verified'
    and not (school_status = 'pending' and school_submitter = uid)
  ) then raise exception 'SCHOOL_NOT_AVAILABLE'; end if;
  if not exists (
    select 1 from public.teacher_academic_assignments where teacher_id = uid
  ) then raise exception 'LEVELS_REQUIRED'; end if;
  if exists (
    select 1
    from public.teacher_academic_assignments a
    join public.levels l on l.id = a.level_id
    where a.teacher_id = uid and l.requires_track and a.track_id is null
  ) then raise exception 'TRACK_REQUIRED'; end if;
  if user_email = '' then raise exception 'EMAIL_REQUIRED'; end if;

  update public.profiles
  set phone = btrim(_phone),
      onboarded = true,
      teacher_verification_status = 'pending',
      teacher_verification_note = null,
      updated_at = now()
  where id = uid;

  insert into public.teacher_verification_requests (teacher_id, email, school_id)
  values (uid, user_email, teacher_profile.school_id)
  on conflict (teacher_id) where status = 'pending'
  do update set
    email = excluded.email,
    school_id = excluded.school_id,
    submitted_at = now(),
    review_note = null;
end
$$;

revoke all on function public.finish_teacher_onboarding(text) from public, anon;
grant execute on function public.finish_teacher_onboarding(text) to authenticated;

create or replace function public.finish_student_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  student_profile public.profiles%rowtype;
  selected_level public.levels%rowtype;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('student') then raise exception 'STUDENT_ROLE_REQUIRED'; end if;
  select * into student_profile
  from public.profiles where id = uid and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if char_length(btrim(coalesce(student_profile.full_name, ''))) not between 1 and 120 then
    raise exception 'NAME_REQUIRED';
  end if;
  if not coalesce(student_profile.geographical_department = any(array[
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  ]), false) then
    raise exception 'DEPARTMENT_REQUIRED';
  end if;
  select * into selected_level from public.levels where id = student_profile.level_id;
  if not found then raise exception 'LEVEL_REQUIRED'; end if;
  if selected_level.requires_track and not exists (
    select 1 from public.tracks
    where id = student_profile.track_id and level_id = selected_level.id
  ) then raise exception 'TRACK_REQUIRED'; end if;

  update public.profiles set onboarded = true, updated_at = now() where id = uid;
end
$$;

revoke all on function public.finish_student_onboarding() from public, anon;
grant execute on function public.finish_student_onboarding() to authenticated;

create or replace function public.admin_review_school(_school_id uuid, _status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _status not in ('verified', 'rejected') then raise exception 'INVALID_STATUS'; end if;
  update public.schools
  set verification_status = _status, updated_at = now()
  where id = _school_id;
  if not found then raise exception 'SCHOOL_NOT_FOUND'; end if;
end
$$;

revoke all on function public.admin_review_school(uuid, text) from public, anon;
grant execute on function public.admin_review_school(uuid, text) to authenticated;

create or replace function public.admin_review_school_contact_correction(
  _correction_id uuid,
  _status text,
  _review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  correction public.school_contact_corrections%rowtype;
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _status not in ('approved', 'rejected') then raise exception 'INVALID_STATUS'; end if;
  select * into correction from public.school_contact_corrections
  where id = _correction_id and status = 'pending'
  for update;
  if not found then raise exception 'CORRECTION_NOT_FOUND'; end if;

  if _status = 'approved' then
    update public.schools
    set phone = coalesce(correction.proposed_phone, phone),
        email = coalesce(correction.proposed_email, email),
        updated_at = now()
    where id = correction.school_id;
  end if;
  update public.school_contact_corrections
  set status = _status,
      review_note = nullif(btrim(coalesce(_review_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _correction_id;
end
$$;

revoke all on function public.admin_review_school_contact_correction(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_school_contact_correction(uuid, text, text)
  to authenticated;

create or replace function public.admin_review_teacher_verification(
  _request_id uuid,
  _status text,
  _review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.teacher_verification_requests%rowtype;
begin
  if not private.has_role('admin') then raise exception 'FORBIDDEN'; end if;
  if _status not in ('approved', 'rejected') then raise exception 'INVALID_STATUS'; end if;
  select * into request_row from public.teacher_verification_requests
  where id = _request_id and status = 'pending'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  update public.teacher_verification_requests
  set status = _status,
      review_note = nullif(btrim(coalesce(_review_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _request_id;
  update public.profiles
  set teacher_verification_status = _status,
      teacher_verification_note = nullif(btrim(coalesce(_review_note, '')), ''),
      updated_at = now()
  where id = request_row.teacher_id;
end
$$;

revoke all on function public.admin_review_teacher_verification(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_teacher_verification(uuid, text, text)
  to authenticated;

create or replace function public.resubmit_teacher_verification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  teacher_profile public.profiles%rowtype;
  user_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  select * into teacher_profile from public.profiles
  where id = uid and onboarded and teacher_verification_status = 'rejected';
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
  if teacher_profile.school_id is null or user_email = '' then raise exception 'PROFILE_INCOMPLETE'; end if;

  update public.profiles
  set teacher_verification_status = 'pending', teacher_verification_note = null, updated_at = now()
  where id = uid;
  insert into public.teacher_verification_requests (teacher_id, email, school_id)
  values (uid, user_email, teacher_profile.school_id);
end
$$;

revoke all on function public.resubmit_teacher_verification() from public, anon;
grant execute on function public.resubmit_teacher_verification() to authenticated;

alter policy "Courses insert" on public.courses
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and (status <> 'published' or private.is_teacher_verified())
  );

alter policy "Courses update" on public.courses
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  )
  with check (
    (
      author_id = auth.uid()
      and private.is_onboarded()
      and (status <> 'published' or private.is_teacher_verified())
    )
    or private.has_role('admin')
  );

alter policy "Exams insert" on public.exams
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and private.is_teacher_verified()
    and file_path like auth.uid()::text || '/%'
  );

alter policy "Exams update" on public.exams
  using (
    (author_id = auth.uid() and private.is_onboarded())
    or private.has_role('admin')
  )
  with check (
    (
      author_id = auth.uid()
      and private.is_onboarded()
      and (status <> 'published' or private.is_teacher_verified())
    )
    or private.has_role('admin')
  );

alter policy "Exam files upload" on storage.objects
  with check (
    bucket_id = 'exams'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.has_role('teacher')
    and private.is_onboarded()
    and private.is_teacher_verified()
  );
