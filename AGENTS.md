<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Academic hierarchy (levels → tracks → subjects → chapters → topics) lives in database tables with link tables; never hardcode it in components — the catalog is read via `src/lib/catalog.ts`.
- Roles live in `user_roles`; users pick student/teacher only through the `complete_onboarding` RPC, and admins change roles via `admin_set_role` — never insert roles from the client.
- Classification of profiles/courses/exams is validated by the `validate_classification` DB trigger; client checks are UX only.
- Exam PDFs live in the private `exams` bucket under `<uid>/`, read only via short-lived signed URLs; storage policies allow reads of own, admin, or published files.
- All UI strings go through `src/lib/i18n.tsx` (FR + Kreyòl keys must stay in sync).
