create or replace function private.initialize_teacher_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'teacher' then
    update public.profiles
    set teacher_verification_status = 'pending',
        teacher_verification_note = null,
        updated_at = now()
    where id = new.user_id
      and teacher_verification_status = 'not_applicable';
  end if;
  return new;
end
$$;

revoke all on function private.initialize_teacher_verification_status() from public, anon, authenticated;

create trigger initialize_teacher_verification_status
  after insert on public.user_roles
  for each row
  execute function private.initialize_teacher_verification_status();
