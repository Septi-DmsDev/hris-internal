alter table public.employees
  add column if not exists bpjs_ketenagakerjaan_number varchar(50),
  add column if not exists bpjs_ketenagakerjaan_active boolean not null default false,
  add column if not exists bpjs_kesehatan_number varchar(50),
  add column if not exists bpjs_kesehatan_active boolean not null default false;
