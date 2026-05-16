do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'overtime_placement'
  ) then
    create type overtime_placement as enum ('BEFORE_SHIFT', 'AFTER_SHIFT');
  end if;
end $$;

alter table overtime_requests
  add column if not exists overtime_placement overtime_placement not null default 'AFTER_SHIFT';
