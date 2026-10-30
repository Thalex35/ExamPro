# EXAMPRO — MVP Plan (Sprint 1 foundation)

## Audit
- Project is a fresh template: no approved screens, components or backend exist yet. Only design inputs are the brief's brand tokens (Navy #0B1F3A, Cyan #00C2D7, Deep blue #075985, Inter) and the two uploaded logos.
- The full horizontal logo will be used in the header/footer; the cap-and-books icon becomes the favicon and mobile logo.

## Proposed architecture
- Lovable Cloud for database, login and secure file storage.
- French + Kreyol interface via translation dictionaries, language saved per browser and on the profile.
- Roles stored in a separate roles table (student, teacher, admin); every permission enforced in the database, not only on screen.

## Academic data model
```text
levels (9e AF, Terminale)
  └─ tracks (SMP, SVT, LLA, SES) — Terminale only
level_subjects / track_subjects  ← links, not hardcoded
subjects ─ chapters ─ topics
courses  (teacher, level, track?, subject, chapter?, topic?, status draft|published)
exams    (teacher, level, track?, subject, year, session, file, status)
profiles (name, language, level, track? — track required only for Terminale)
user_roles
```
Initial catalog seeded from Part 3 of the brief (subjects, Math domains, Sciences sociales split). 9e subjects/topics seeded as starter entries clearly flagged "to verify against official curriculum".

## MVP screens
1. Landing page (intro, benefits, how it works, sign up / log in, language switch)
2. Sign up with role choice → student form (level, track if Terminale) or teacher form (subjects taught)
3. Log in / log out / password reset
4. Student dashboard + Subjects section: subject → chapter → topic, filtered by the student's level/track, showing published courses
5. Exam archive: browse/filter published exams, secure file viewing
6. Teacher portal: dashboard, create/edit course, upload exam (PDF), dynamic academic fields, draft/publish
7. Minimal admin: manage catalog (levels, tracks, subjects, chapters, topics), view users, unpublish content

## Security
- Students see only published content; drafts visible only to their author and admins.
- Exam files in a private storage bucket, served via short-lived signed links to signed-in users.
- Teachers can edit only their own content; only admins edit the catalog and roles.

## Implementation order
Foundation & design system → login & registration → catalog schema + seed → profiles & dashboards → Subjects section → course creation → exam upload & archive → publishing rules → admin → security checks & tests.

## Decisions for you
- First admin account: I'll make the first account you create an admin (please confirm your email later).
- Sign-in method: email + password, plus Google sign-in. Tell me if you want only one.
- Not in this sprint: quizzes, exam simulator, reviewer portal, AI tutor, payments (data model leaves room for them).
