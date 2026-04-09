# Supabase

The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local` (see `.env.example` at the project root).

## Apply the schema

1. Open your Supabase project → **SQL editor** → **New query**.
2. Paste the contents of `migrations/0001_init.sql`.
3. Run.

The migration creates `habits` and `habit_completions`, plus the `habit_frequency` enum.

## RLS

Row-level security is **disabled** in this migration. Supabase will warn you in the dashboard, which is intentional — it's the forcing function to re-enable it once auth is added. For now the anon key can read and write everything, which is fine for a single-user dev project.
