REVOKE UPDATE (level_id) ON public.profiles FROM authenticated;

create or replace function private.prevent_student_academic_level_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.level_id is not null
    and new.level_id is distinct from old.level_id
    and exists (
      select 1
      from public.user_roles
      where user_id = old.id
        and role = 'student'
    )
    and not exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    ) then
    raise exception 'STUDENT_LEVEL_IMMUTABLE'
      using errcode = '42501';
  end if;

  return new;
end
$$;

revoke all on function private.prevent_student_academic_level_change()
  from public, anon, authenticated;

create trigger trg_profiles_student_level_immutable
  before update of level_id on public.profiles
  for each row
  execute function private.prevent_student_academic_level_change();
