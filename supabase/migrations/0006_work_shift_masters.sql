CREATE TABLE "work_shift_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"is_overnight" boolean DEFAULT false NOT NULL,
	"applicable_division_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_shift_masters_code_unique" UNIQUE("code")
);
--> statement-breakpoint
INSERT INTO "work_shift_masters" ("code", "name", "start_time", "end_time", "is_overnight", "applicable_division_codes", "notes", "sort_order", "is_active")
VALUES
  ('SHIFT_1', 'Shift 1', '07:00', '16:00', false, '["FINISHING","PRINTING","DESAIN","CSM","OFFSET","PABRIK","REMBU"]'::jsonb, 'Shift reguler siang', 10, true),
  ('SHIFT_2A', 'Shift 2A', '12:00', '21:00', false, '["FINISHING","PRINTING","DESAIN","CSM"]'::jsonb, 'Finishing perempuan, Print/Desain perempuan, CSM', 20, true),
  ('SHIFT_2B', 'Shift 2B', '14:00', '23:00', false, '["FINISHING","PRINTING"]'::jsonb, 'Finishing laki-laki dan Print laki-laki', 30, true),
  ('SHIFT_2C', 'Shift 2C', '16:00', '01:00', true, '["DESAIN"]'::jsonb, 'Khusus bagian Desain', 40, true),
  ('SHIFT_3A', 'Shift 3A', '14:00', '19:00', false, '["CSM"]'::jsonb, 'Khusus bagian CSM', 50, true),
  ('SHIFT_3B', 'Shift 3B', '22:00', '07:00', true, '["FINISHING","PRINTING"]'::jsonb, 'Finishing laki-laki dan Print laki-laki', 60, true),
  ('IZIN', 'Status Izin', '00:00', '00:01', false, '[]'::jsonb, 'Penanda sistem jika karyawan sedang dalam status izin', 99, true);
