create or replace function public.save_teacher_onboarding_department(_department text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not private.has_role('teacher') then raise exception 'TEACHER_ROLE_REQUIRED'; end if;
  if _department not in (
    'Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord',
    'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est'
  ) then raise exception 'DEPARTMENT_INVALID'; end if;

  update public.profiles
  set geographical_department = _department, updated_at = now()
  where id = auth.uid() and not onboarded;
  if not found then raise exception 'PROFILE_NOT_AVAILABLE'; end if;
end
$$;

revoke all on function public.save_teacher_onboarding_department(text) from public, anon;
grant execute on function public.save_teacher_onboarding_department(text) to authenticated;
