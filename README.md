# Screenshot Exact Match

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a3b8c848-d753-456e-a2e8-dad22169ea59).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Database migrations

Supabase SQL migrations in `supabase/migrations/` are the source of truth. Add
new schema changes as timestamped SQL files in that directory, for example
`supabase/migrations/<timestamp>_<description>.sql`. Do not generate or edit
migrations with Drizzle.

### Local development and fresh local databases

The following commands start and reset the local Supabase stack. `db reset`
recreates the **local** database and applies every migration in
`supabase/migrations/`; it does not target the linked ExamPro project:

```sh
npm exec supabase -- start
npm exec supabase -- db reset
```

Run the reset only when it is acceptable to recreate local database data.

### Inspecting the linked project

To compare local migration versions with the configured remote project, run:

```sh
npm exec supabase -- migration list --linked
```

This lists migration history and does not apply migrations. The linked project
is selected by `supabase/config.toml`; confirm that it is the intended
environment before any remote operation.

Applying migrations to a remote project changes its database. Do not run
`supabase db push` or another migration-apply command against ExamPro without
explicit approval and a reviewed deployment plan.
