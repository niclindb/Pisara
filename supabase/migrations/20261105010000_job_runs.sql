-- A record of each daily delivery run, so a failed 8am run is visible after
-- Vercel's short-lived logs are gone. Written and read only by the server
-- (which connects as the database owner); no access through the public API.

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  learners int not null default 0,
  delivered int not null default 0,
  reminders int not null default 0,
  skipped int not null default 0,
  failed int not null default 0,
  -- The whole run crashed, or the first learner that failed: enough to start looking.
  first_error text
);

create index job_runs_started_at on public.job_runs (started_at desc);

alter table public.job_runs enable row level security;
-- No policies: visitors and learners can't read or write it.
