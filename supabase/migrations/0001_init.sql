-- Habit tracker initial schema.
-- Single-user dev project: RLS is OFF. Re-enable + add auth-scoped policies
-- before exposing to multiple users.

create extension if not exists "pgcrypto";

create type habit_frequency as enum ('daily', 'weekly', 'monthly');

create table habits (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint habits_name_not_blank check (length(trim(name)) > 0),
  description text,
  frequency habit_frequency not null,
  target_per_period integer not null default 1
    constraint habits_target_positive check (target_per_period >= 1),
  created_at timestamptz not null default now()
);

create table habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index habit_completions_habit_id_completed_at_idx
  on habit_completions (habit_id, completed_at desc);

alter table habits disable row level security;
alter table habit_completions disable row level security;
