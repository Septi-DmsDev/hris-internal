create table if not exists public.employee_hobbies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  hobby_name varchar(150) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_education_histories (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  institution_name varchar(200) not null,
  degree varchar(120),
  major varchar(150),
  start_year integer,
  end_year integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_competencies (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  competency_name varchar(200) not null,
  level varchar(50),
  issuer varchar(150),
  certified_at date,
  attachment_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_hobbies_employee_id_idx on public.employee_hobbies(employee_id);
create index if not exists employee_education_histories_employee_id_idx on public.employee_education_histories(employee_id);
create index if not exists employee_competencies_employee_id_idx on public.employee_competencies(employee_id);

