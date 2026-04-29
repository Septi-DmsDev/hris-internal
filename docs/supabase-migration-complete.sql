-- =============================================================================
-- HRD Dashboard — Complete Supabase Migration
-- Generated: 2026-04-29
-- Run this in Supabase SQL Editor (one paste, fresh project)
-- All tables are in the `public` schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- 1. updated_at auto-update trigger function
--    Drizzle's $onUpdateFn() runs at the app layer. This trigger makes the DB
--    handle it natively as well (belt-and-suspenders, safe to keep both).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------------

-- Master
CREATE TYPE public.employee_group AS ENUM (
  'MANAGERIAL',
  'TEAMWORK'
);

-- Employee
CREATE TYPE public.employment_status AS ENUM (
  'TRAINING',
  'REGULER',
  'DIALIHKAN_TRAINING',
  'TIDAK_LOLOS',
  'NONAKTIF',
  'RESIGN'
);

CREATE TYPE public.payroll_status AS ENUM (
  'TRAINING',
  'REGULER',
  'FINAL_PAYROLL',
  'NONAKTIF'
);

CREATE TYPE public.work_day_status AS ENUM (
  'KERJA',
  'OFF',
  'CUTI',
  'SAKIT',
  'IZIN',
  'ALPA',
  'SETENGAH_HARI'
);

-- Auth  (KABAG is new — added in Role System Foundation sub-project 1)
CREATE TYPE public.user_role AS ENUM (
  'SUPER_ADMIN',
  'HRD',
  'KABAG',
  'SPV',
  'MANAGERIAL',
  'FINANCE',
  'TEAMWORK',
  'PAYROLL_VIEWER'
);

-- HR / Ticketing
CREATE TYPE public.ticket_type AS ENUM (
  'CUTI',
  'SAKIT',
  'IZIN',
  'EMERGENCY',
  'SETENGAH_HARI'
);

CREATE TYPE public.ticket_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'AUTO_APPROVED',
  'AUTO_REJECTED',
  'NEED_REVIEW',
  'APPROVED_SPV',
  'APPROVED_HRD',
  'REJECTED',
  'CANCELLED',
  'LOCKED'
);

CREATE TYPE public.ticket_payroll_impact AS ENUM (
  'UNPAID',
  'PAID_QUOTA_MONTHLY',
  'PAID_QUOTA_ANNUAL'
);

CREATE TYPE public.review_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'VALIDATED',
  'LOCKED'
);

CREATE TYPE public.incident_type AS ENUM (
  'KOMPLAIN',
  'MISS_PROSES',
  'TELAT',
  'AREA_KOTOR',
  'PELANGGARAN',
  'SP1',
  'SP2',
  'PENGHARGAAN'
);

CREATE TYPE public.incident_impact AS ENUM (
  'REVIEW_ONLY',
  'PAYROLL_POTENTIAL',
  'NONE'
);

-- Point / Performance
CREATE TYPE public.point_catalog_version_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

CREATE TYPE public.activity_status AS ENUM (
  'DRAFT',
  'DIAJUKAN',
  'DITOLAK_SPV',
  'REVISI_TW',
  'DIAJUKAN_ULANG',
  'DISETUJUI_SPV',
  'OVERRIDE_HRD',
  'DIKUNCI_PAYROLL'
);

CREATE TYPE public.point_approval_action AS ENUM (
  'SUBMIT',
  'APPROVE_SPV',
  'REJECT_SPV',
  'RESUBMIT',
  'OVERRIDE_HRD',
  'LOCK_PAYROLL'
);

CREATE TYPE public.monthly_point_performance_status AS ENUM (
  'DRAFT',
  'FINALIZED',
  'LOCKED'
);

-- Payroll
CREATE TYPE public.payroll_period_status AS ENUM (
  'OPEN',
  'DATA_REVIEW',
  'DRAFT',
  'FINALIZED',
  'PAID',
  'LOCKED'
);

CREATE TYPE public.payroll_adjustment_type AS ENUM (
  'ADDITION',
  'DEDUCTION'
);

CREATE TYPE public.managerial_kpi_status AS ENUM (
  'DRAFT',
  'VALIDATED',
  'LOCKED'
);

CREATE TYPE public.payroll_audit_action AS ENUM (
  'CREATE_PERIOD',
  'GENERATE_PREVIEW',
  'FINALIZE',
  'MARK_PAID',
  'LOCK',
  'ADD_ADJUSTMENT'
);


-- ---------------------------------------------------------------------------
-- 3. Master Data Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.divisions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(100) NOT NULL,
  code                    VARCHAR(20)  NOT NULL UNIQUE,
  branch_id               UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
  training_pass_percent   INTEGER NOT NULL DEFAULT 80,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  code            VARCHAR(20)  NOT NULL UNIQUE,
  employee_group  public.employee_group NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.grades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,
  code        VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 4. Employee Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.employees (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code             VARCHAR(30)  NOT NULL UNIQUE,
  full_name                 VARCHAR(150) NOT NULL,
  nickname                  VARCHAR(100),
  photo_url                 TEXT,
  phone_number              VARCHAR(30),
  address                   TEXT,
  start_date                DATE NOT NULL,
  branch_id                 UUID NOT NULL REFERENCES public.branches(id)   ON DELETE RESTRICT,
  division_id               UUID NOT NULL REFERENCES public.divisions(id)  ON DELETE RESTRICT,
  position_id               UUID NOT NULL REFERENCES public.positions(id)  ON DELETE RESTRICT,
  jobdesk                   VARCHAR(100),
  grade_id                  UUID NOT NULL REFERENCES public.grades(id)     ON DELETE RESTRICT,
  employee_group            public.employee_group NOT NULL,
  employment_status         public.employment_status NOT NULL DEFAULT 'TRAINING',
  payroll_status            public.payroll_status   NOT NULL DEFAULT 'TRAINING',
  supervisor_employee_id    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  training_graduation_date  DATE,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_division_histories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_division_id  UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  new_division_id       UUID NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  effective_date        DATE NOT NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_position_histories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_position_id  UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  new_position_id       UUID NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
  effective_date        DATE NOT NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_grade_histories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_grade_id   UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  new_grade_id        UUID NOT NULL REFERENCES public.grades(id) ON DELETE RESTRICT,
  effective_date      DATE NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_supervisor_histories (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                       UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_supervisor_employee_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  new_supervisor_employee_id        UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  effective_date                    DATE NOT NULL,
  notes                             TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_status_histories (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                 UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  previous_employment_status  public.employment_status,
  new_employment_status       public.employment_status NOT NULL,
  previous_payroll_status     public.payroll_status,
  new_payroll_status          public.payroll_status NOT NULL,
  effective_date              DATE NOT NULL,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.work_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POINT_TARGET_HARIAN default = 13000 (from src/config/constants.ts)
CREATE TABLE public.work_schedule_days (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES public.work_schedules(id) ON DELETE CASCADE,
  day_of_week     INTEGER NOT NULL,   -- 0=Sun … 6=Sat
  day_status      public.work_day_status NOT NULL DEFAULT 'KERJA',
  is_working_day  BOOLEAN NOT NULL DEFAULT true,
  start_time      VARCHAR(5),          -- HH:MM
  end_time        VARCHAR(5),
  target_points   INTEGER NOT NULL DEFAULT 13000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_schedule_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES public.employees(id)     ON DELETE CASCADE,
  schedule_id           UUID NOT NULL REFERENCES public.work_schedules(id) ON DELETE RESTRICT,
  effective_start_date  DATE NOT NULL,
  effective_end_date    DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 5. Auth / Role Tables
-- ---------------------------------------------------------------------------

-- user_roles links Supabase auth users to app roles + employee records
CREATE TABLE public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'TEAMWORK',
  -- DEPRECATED: kept for zero-downtime migration; reads must use user_role_divisions
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  -- Link to employee record — required for all non-SUPER_ADMIN roles
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for multi-division scoping (SPV = 1 row, KABAG = 1-N rows)
CREATE TABLE public.user_role_divisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id  UUID NOT NULL REFERENCES public.user_roles(id)  ON DELETE CASCADE,
  division_id   UUID NOT NULL REFERENCES public.divisions(id)   ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, division_id)
);


-- ---------------------------------------------------------------------------
-- 6. HR Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.attendance_tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  ticket_type         public.ticket_type   NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  days_count          INTEGER NOT NULL DEFAULT 1,
  reason              TEXT NOT NULL,
  attachment_url      TEXT,
  status              public.ticket_status NOT NULL DEFAULT 'DRAFT',
  payroll_impact      public.ticket_payroll_impact,
  review_notes        TEXT,
  approved_by_user_id UUID,   -- references auth.users implicitly
  approved_at         TIMESTAMPTZ,
  rejected_by_user_id UUID,
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_by_user_id  UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.leave_quotas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year                  INTEGER NOT NULL,
  monthly_quota_total   INTEGER NOT NULL DEFAULT 12,
  monthly_quota_used    INTEGER NOT NULL DEFAULT 0,
  annual_quota_total    INTEGER NOT NULL DEFAULT 3,
  annual_quota_used     INTEGER NOT NULL DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, year)
);

CREATE TABLE public.employee_reviews (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                 UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_employee_id        UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  period_start_date           DATE NOT NULL,
  period_end_date             DATE NOT NULL,
  sop_quality_score           INTEGER,    -- 1-5, weight 25%
  instruction_score           INTEGER,    -- 1-5, weight 15%
  attendance_discipline_score INTEGER,    -- 1-5, weight 20%
  initiative_teamwork_score   INTEGER,    -- 1-5, weight 20%
  process_miss_score          INTEGER,    -- 1-5, weight 20%
  total_score                 NUMERIC(5, 2),
  category                    VARCHAR(30),  -- Sangat Baik/Baik/Cukup/Kurang/Buruk
  status                      public.review_status NOT NULL DEFAULT 'DRAFT',
  review_notes                TEXT,
  validated_by_user_id        UUID,
  validated_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  division_id         UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  incident_type       public.incident_type   NOT NULL,
  incident_date       DATE NOT NULL,
  description         TEXT NOT NULL,
  impact              public.incident_impact NOT NULL DEFAULT 'REVIEW_ONLY',
  payroll_deduction   NUMERIC(12, 2),
  recorded_by_user_id UUID NOT NULL,
  recorded_by_role    public.user_role NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 7. Point / Performance Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.point_catalog_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50) NOT NULL UNIQUE,
  source_file_name    VARCHAR(255),
  notes               TEXT,
  status              public.point_catalog_version_status NOT NULL DEFAULT 'DRAFT',
  effective_start_date DATE NOT NULL,
  effective_end_date   DATE,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.division_point_target_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id      UUID NOT NULL REFERENCES public.point_catalog_versions(id) ON DELETE CASCADE,
  division_code   VARCHAR(20),
  division_name   VARCHAR(100) NOT NULL,
  target_points   INTEGER NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.point_catalog_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id          UUID NOT NULL REFERENCES public.point_catalog_versions(id) ON DELETE CASCADE,
  division_code       VARCHAR(20),
  division_name       VARCHAR(100) NOT NULL,
  external_row_number INTEGER,
  external_code       VARCHAR(50),
  work_name           TEXT NOT NULL,
  point_value         NUMERIC(12, 2) NOT NULL,
  unit_description    TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_activity_entries (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                 UUID NOT NULL REFERENCES public.employees(id)            ON DELETE CASCADE,
  work_date                   DATE NOT NULL,
  actual_division_id          UUID REFERENCES public.divisions(id)                     ON DELETE SET NULL,
  point_catalog_entry_id      UUID NOT NULL REFERENCES public.point_catalog_entries(id) ON DELETE RESTRICT,
  point_catalog_version_id    UUID NOT NULL REFERENCES public.point_catalog_versions(id) ON DELETE RESTRICT,
  point_catalog_division_name VARCHAR(100) NOT NULL,
  work_name_snapshot          TEXT NOT NULL,
  unit_description_snapshot   TEXT,
  point_value_snapshot        NUMERIC(12, 2) NOT NULL,
  quantity                    NUMERIC(12, 2) NOT NULL,
  total_points                NUMERIC(14, 2) NOT NULL,
  status                      public.activity_status NOT NULL DEFAULT 'DRAFT',
  notes                       TEXT,
  submitted_at                TIMESTAMPTZ,
  approved_at                 TIMESTAMPTZ,
  rejected_at                 TIMESTAMPTZ,
  locked_at                   TIMESTAMPTZ,
  created_by_user_id          UUID NOT NULL,
  updated_by_user_id          UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_activity_approval_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_entry_id UUID NOT NULL REFERENCES public.daily_activity_entries(id) ON DELETE CASCADE,
  action            public.point_approval_action NOT NULL,
  actor_user_id     UUID NOT NULL,
  actor_role        public.user_role NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.monthly_point_performances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start_date     DATE NOT NULL,
  period_end_date       DATE NOT NULL,
  division_snapshot_id  UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  division_snapshot_name VARCHAR(100) NOT NULL,
  target_daily_points   INTEGER NOT NULL,
  target_days           INTEGER NOT NULL,
  total_target_points   INTEGER NOT NULL,
  total_approved_points NUMERIC(14, 2) NOT NULL,
  performance_percent   NUMERIC(7, 2) NOT NULL,
  status                public.monthly_point_performance_status NOT NULL DEFAULT 'DRAFT',
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 8. Payroll Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.employee_salary_configs (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                   UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary_amount            NUMERIC(12, 2),
  grade_allowance_amount        NUMERIC(12, 2),
  tenure_allowance_amount       NUMERIC(12, 2),
  daily_allowance_amount        NUMERIC(12, 2),
  performance_bonus_base_amount NUMERIC(12, 2),
  achievement_bonus_140_amount  NUMERIC(12, 2),
  achievement_bonus_165_amount  NUMERIC(12, 2),
  fulltime_bonus_amount         NUMERIC(12, 2),
  discipline_bonus_amount       NUMERIC(12, 2),
  team_bonus_amount             NUMERIC(12, 2),
  overtime_rate_amount          NUMERIC(12, 2),
  notes                         TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_periods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_code           VARCHAR(7) NOT NULL UNIQUE,  -- format: YYYY-MM
  period_start_date     DATE NOT NULL,
  period_end_date       DATE NOT NULL,
  status                public.payroll_period_status NOT NULL DEFAULT 'OPEN',
  notes                 TEXT,
  preview_generated_at  TIMESTAMPTZ,
  finalized_at          TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  locked_at             TIMESTAMPTZ,
  created_by_user_id    UUID NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.managerial_kpi_summaries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id             UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES public.employees(id)       ON DELETE CASCADE,
  performance_percent   NUMERIC(7, 2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  status                public.managerial_kpi_status NOT NULL DEFAULT 'DRAFT',
  validated_by_user_id  UUID,
  validated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, employee_id)
);

CREATE TABLE public.payroll_employee_snapshots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id                   UUID NOT NULL REFERENCES public.payroll_periods(id)  ON DELETE CASCADE,
  employee_id                 UUID NOT NULL REFERENCES public.employees(id)        ON DELETE RESTRICT,
  employee_code_snapshot      VARCHAR(50)  NOT NULL,
  employee_name_snapshot      VARCHAR(150) NOT NULL,
  branch_snapshot_id          UUID REFERENCES public.branches(id)   ON DELETE SET NULL,
  branch_snapshot_name        VARCHAR(100),
  division_snapshot_id        UUID REFERENCES public.divisions(id)  ON DELETE SET NULL,
  division_snapshot_name      VARCHAR(100) NOT NULL,
  position_snapshot_id        UUID REFERENCES public.positions(id)  ON DELETE SET NULL,
  position_snapshot_name      VARCHAR(100) NOT NULL,
  grade_snapshot_id           UUID REFERENCES public.grades(id)     ON DELETE SET NULL,
  grade_snapshot_name         VARCHAR(50),
  employee_group_snapshot     public.employee_group      NOT NULL,
  employment_status_snapshot  public.employment_status   NOT NULL,
  payroll_status_snapshot     public.payroll_status      NOT NULL,
  base_salary_amount          NUMERIC(12, 2) NOT NULL,
  grade_allowance_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tenure_allowance_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  daily_allowance_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  performance_bonus_base_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  achievement_bonus_140_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  achievement_bonus_165_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fulltime_bonus_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discipline_bonus_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  team_bonus_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  overtime_rate_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  scheduled_work_days         INTEGER NOT NULL DEFAULT 0,
  active_employment_days      INTEGER NOT NULL DEFAULT 0,
  snapshot_taken_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_results (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id                 UUID NOT NULL REFERENCES public.payroll_periods(id)          ON DELETE CASCADE,
  employee_id               UUID NOT NULL REFERENCES public.employees(id)                ON DELETE RESTRICT,
  snapshot_id               UUID NOT NULL REFERENCES public.payroll_employee_snapshots(id) ON DELETE CASCADE,
  monthly_performance_id    UUID REFERENCES public.monthly_point_performances(id)        ON DELETE SET NULL,
  managerial_kpi_summary_id UUID REFERENCES public.managerial_kpi_summaries(id)         ON DELETE SET NULL,
  performance_percent       NUMERIC(7, 2)  NOT NULL DEFAULT 0,
  total_approved_points     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_target_points       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  approved_unpaid_leave_days  INTEGER NOT NULL DEFAULT 0,
  approved_paid_leave_days    INTEGER NOT NULL DEFAULT 0,
  incident_deduction_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sp_penalty_multiplier       NUMERIC(5, 2)  NOT NULL DEFAULT 1,
  manual_adjustment_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  base_salary_paid          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grade_allowance_paid      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tenure_allowance_paid     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  daily_allowance_paid      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  overtime_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_fulltime_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_discipline_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_kinerja_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_prestasi_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_team_amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_addition_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_deduction_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  take_home_pay             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  breakdown                 JSONB NOT NULL DEFAULT '{}',
  status                    public.payroll_period_status NOT NULL DEFAULT 'DRAFT',
  calculated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_adjustments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id         UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES public.employees(id)       ON DELETE CASCADE,
  adjustment_type   public.payroll_adjustment_type NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL,
  reason            TEXT NOT NULL,
  applied_by_user_id UUID NOT NULL,
  applied_by_role   public.user_role NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  action        public.payroll_audit_action NOT NULL,
  actor_user_id UUID NOT NULL,
  actor_role    public.user_role NOT NULL,
  notes         TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------------------

-- Employee lookups
CREATE INDEX idx_employees_division      ON public.employees(division_id);
CREATE INDEX idx_employees_branch        ON public.employees(branch_id);
CREATE INDEX idx_employees_status        ON public.employees(employment_status, is_active);
CREATE INDEX idx_employees_supervisor    ON public.employees(supervisor_employee_id);

-- Tickets
CREATE INDEX idx_tickets_employee        ON public.attendance_tickets(employee_id);
CREATE INDEX idx_tickets_status          ON public.attendance_tickets(status);
CREATE INDEX idx_tickets_created_by      ON public.attendance_tickets(created_by_user_id);
CREATE INDEX idx_tickets_dates           ON public.attendance_tickets(start_date, end_date);

-- Leave quotas
CREATE INDEX idx_leave_quotas_employee   ON public.leave_quotas(employee_id, year);

-- Reviews & incidents
CREATE INDEX idx_reviews_employee        ON public.employee_reviews(employee_id);
CREATE INDEX idx_reviews_status          ON public.employee_reviews(status);
CREATE INDEX idx_incidents_employee      ON public.incident_logs(employee_id);
CREATE INDEX idx_incidents_division      ON public.incident_logs(division_id);

-- Performance
CREATE INDEX idx_daily_entries_employee  ON public.daily_activity_entries(employee_id, work_date);
CREATE INDEX idx_daily_entries_status    ON public.daily_activity_entries(status);
CREATE INDEX idx_monthly_perf_employee   ON public.monthly_point_performances(employee_id, period_start_date);

-- Payroll
CREATE INDEX idx_payroll_results_period  ON public.payroll_results(period_id, employee_id);
CREATE INDEX idx_payroll_adj_period      ON public.payroll_adjustments(period_id);
CREATE INDEX idx_payroll_audit_period    ON public.payroll_audit_logs(period_id);

-- Role divisions junction
CREATE INDEX idx_role_divisions_user_role ON public.user_role_divisions(user_role_id);
CREATE INDEX idx_role_divisions_division  ON public.user_role_divisions(division_id);

-- User roles
CREATE INDEX idx_user_roles_employee     ON public.user_roles(employee_id);


-- ---------------------------------------------------------------------------
-- 10. updated_at Triggers
--     Apply to every table that has an updated_at column.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_divisions_updated_at
  BEFORE UPDATE ON public.divisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_work_schedule_days_updated_at
  BEFORE UPDATE ON public.work_schedule_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_attendance_tickets_updated_at
  BEFORE UPDATE ON public.attendance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_leave_quotas_updated_at
  BEFORE UPDATE ON public.leave_quotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employee_reviews_updated_at
  BEFORE UPDATE ON public.employee_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_incident_logs_updated_at
  BEFORE UPDATE ON public.incident_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_point_catalog_versions_updated_at
  BEFORE UPDATE ON public.point_catalog_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_division_point_target_rules_updated_at
  BEFORE UPDATE ON public.division_point_target_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_point_catalog_entries_updated_at
  BEFORE UPDATE ON public.point_catalog_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_daily_activity_entries_updated_at
  BEFORE UPDATE ON public.daily_activity_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_point_performances_updated_at
  BEFORE UPDATE ON public.monthly_point_performances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employee_salary_configs_updated_at
  BEFORE UPDATE ON public.employee_salary_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_managerial_kpi_summaries_updated_at
  BEFORE UPDATE ON public.managerial_kpi_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payroll_results_updated_at
  BEFORE UPDATE ON public.payroll_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 11. Row-Level Security
--     The app connects via DATABASE_URL (service role / direct Postgres)
--     so RLS is bypassed for all server actions. Disable RLS on all app
--     tables. Auth is enforced at the application layer (session.ts).
-- ---------------------------------------------------------------------------

ALTER TABLE public.branches                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades                         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_division_histories    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_position_histories    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_grade_histories       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_supervisor_histories  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_status_histories      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule_days             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedule_assignments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_divisions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_tickets             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_quotas                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reviews               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_logs                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_catalog_versions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_point_target_rules    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_catalog_entries          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_entries         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_approval_logs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_point_performances     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_configs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods                DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.managerial_kpi_summaries       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_employee_snapshots     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_results                DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_logs             DISABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Done.
-- After running this migration:
-- 1. Go to Authentication → Settings → disable "Enable email confirmations"
--    if you want dev accounts to work immediately.
-- 2. Create auth users in Authentication → Users, then manually INSERT into
--    public.user_roles with the matching user_id and desired role.
-- 3. For SPV/KABAG users, also INSERT into public.user_role_divisions.
-- 4. Set employee_id in user_roles for all non-SUPER_ADMIN users so that
--    self-service ticket/review/performance features work.
-- ---------------------------------------------------------------------------
