create or replace function private.require_verified_teacher_school()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarded and not old.onboarded and exists (
    select 1 from public.user_roles r
    where r.user_id = new.id and r.role = 'teacher'
  ) and not exists (
    select 1 from public.schools s
    where s.id = new.school_id and s.verification_status = 'verified'
  ) then
    raise exception 'SCHOOL_NOT_VERIFIED';
  end if;
  return new;
end
$$;

revoke all on function private.require_verified_teacher_school() from public, anon, authenticated;

create trigger require_verified_teacher_school_before_completion
  before update of onboarded on public.profiles
  for each row
  execute function private.require_verified_teacher_school();
