alter table public.divisions
  add column if not exists daily_point_target integer not null default 13000;
