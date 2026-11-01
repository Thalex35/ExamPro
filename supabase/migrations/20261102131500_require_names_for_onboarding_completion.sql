create or replace function private.require_onboarding_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarded and not old.onboarded and exists (
    select 1 from public.user_roles r
    where r.user_id = new.id and r.role in ('student', 'teacher')
  ) then
    if char_length(btrim(coalesce(new.first_name, ''))) not between 1 and 80
      or char_length(btrim(coalesce(new.last_name, ''))) not between 1 and 80
      or char_length(btrim(coalesce(new.full_name, ''))) not between 1 and 120
      or btrim(new.full_name) <> btrim(new.first_name) || ' ' || btrim(new.last_name) then
      raise exception 'NAME_REQUIRED';
    end if;
  end if;
  return new;
end
$$;

revoke all on function private.require_onboarding_names() from public, anon, authenticated;

create trigger require_onboarding_names_before_completion
  before update of onboarded on public.profiles
  for each row
  execute function private.require_onboarding_names();
