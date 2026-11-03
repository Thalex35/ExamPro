revoke execute on function public.admin_delete_demo_content() from anon;
revoke execute on function public.admin_seed_demo_content() from anon;

grant execute on function public.admin_delete_demo_content() to authenticated;
grant execute on function public.admin_seed_demo_content() to authenticated;
