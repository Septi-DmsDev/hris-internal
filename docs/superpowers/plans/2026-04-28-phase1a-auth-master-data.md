# Phase 1a: Auth, RBAC, Dashboard Layout & Master Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun fondasi Phase 1 HRIS — authentication dengan Supabase Auth, role-based access control, dashboard layout dengan sidebar, dan master data (branches, divisions, positions, grades).

**Architecture:** Next.js App Router dengan Supabase Auth untuk autentikasi, Drizzle ORM untuk schema PostgreSQL, server actions untuk semua mutasi sensitif, RLS Supabase sebagai lapisan keamanan database, shadcn/ui + TanStack Table untuk UI.

**Tech Stack:** Next.js 16, TypeScript strict, Supabase SSR, Drizzle ORM + postgres-js, shadcn/ui (slate), Zod, React Hook Form, TanStack Table, Vitest

---

## File Structure

```
src/
├── middleware.ts                          ← Auth route protection
├── lib/
│   ├── db/
│   │   ├── index.ts                       ← Drizzle client
│   │   └── schema/
│   │       ├── auth.ts                    ← user_roles table
│   │       └── master.ts                  ← branches, divisions, positions, grades
│   ├── auth/
│   │   └── session.ts                     ← getSession, getUser helpers
│   ├── permissions/
│   │   └── index.ts                       ← canAccess(), requireRole() helpers
│   └── validations/
│       ├── auth.ts                        ← loginSchema (Zod)
│       └── master.ts                      ← branchSchema, divisionSchema, etc.
├── server/
│   └── actions/
│       ├── auth.ts                        ← login, logout server actions
│       ├── branches.ts                    ← CRUD server actions
│       ├── divisions.ts
│       ├── positions.ts
│       └── grades.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                    ← nav sidebar dengan role-based menu
│   │   └── Header.tsx                     ← topbar dengan user info
│   └── tables/
│       └── DataTable.tsx                  ← reusable TanStack Table wrapper
└── app/
    ├── (auth)/
    │   └── login/
    │       ├── page.tsx                   ← login page (server)
    │       └── LoginForm.tsx              ← login form (client)
    └── (dashboard)/
        ├── layout.tsx                     ← dashboard shell dengan sidebar
        ├── dashboard/
        │   └── page.tsx                   ← dashboard home
        └── master/
            ├── branches/
            │   └── page.tsx
            ├── divisions/
            │   └── page.tsx
            ├── positions/
            │   └── page.tsx
            └── grades/
                └── page.tsx
```

---

## Task 1: Supabase Connection & Drizzle Setup

**Files:**
- Create: `src/lib/db/index.ts`
- Modify: `.env.local` (buat dari .env.example — manual oleh developer)

**Prasyarat:** Isi `.env.local` dengan nilai dari Supabase VPS kamu sebelum menjalankan task ini.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-vps-ip:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@your-vps-ip:5432/postgres
```

- [ ] **Step 1: Buat Drizzle client**

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as masterSchema from "./schema/master";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, {
  schema: { ...authSchema, ...masterSchema },
});
```

- [ ] **Step 2: Test koneksi berjalan**

```bash
pnpm run build
```

Expected: Build berhasil tanpa error TypeScript. Jika ada error `DATABASE_URL`, pastikan `.env.local` sudah diisi.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat: setup drizzle client with postgres connection"
```

---

## Task 2: Auth Schema — user_roles Table

**Files:**
- Create: `src/lib/db/schema/auth.ts`
- Create: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Buat Drizzle schema untuk user_roles**

```typescript
// src/lib/db/schema/auth.ts
import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "HRD",
  "FINANCE",
  "SPV",
  "TEAMWORK",
  "MANAGERIAL",
  "PAYROLL_VIEWER",
]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("TEAMWORK"),
  divisionId: uuid("division_id"), // null = akses semua, diisi = SPV hanya divisi ini
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
```

- [ ] **Step 2: Buat barrel export schema**

```typescript
// src/lib/db/schema/index.ts
export * from "./auth";
export * from "./master";
```

- [ ] **Step 3: Generate migration**

```bash
pnpm drizzle-kit generate
```

Expected: File migration baru muncul di `supabase/migrations/`.

- [ ] **Step 4: Jalankan migration ke Supabase**

```bash
pnpm drizzle-kit migrate
```

Expected: Migration berhasil, tabel `user_roles` dan enum `user_role` ada di Supabase.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/ supabase/migrations/
git commit -m "feat: add user_roles schema and migration"
```

---

## Task 3: Master Data Schema — branches, divisions, positions, grades

**Files:**
- Create: `src/lib/db/schema/master.ts`

- [ ] **Step 1: Buat schema master data**

```typescript
// src/lib/db/schema/master.ts
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const employeeGroupEnum = pgEnum("employee_group", [
  "MANAGERIAL",
  "TEAMWORK",
]);

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const divisions = pgTable("divisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  branchId: uuid("branch_id").references(() => branches.id),
  trainingPassPercent: varchar("training_pass_percent", { length: 5 }).default("80"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const positions = pgTable("positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  employeeGroup: employeeGroupEnum("employee_group").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Division = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
```

- [ ] **Step 2: Generate dan jalankan migration**

```bash
pnpm drizzle-kit generate && pnpm drizzle-kit migrate
```

Expected: Tabel `branches`, `divisions`, `positions`, `grades` ada di Supabase.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema/master.ts supabase/migrations/
git commit -m "feat: add master data schema (branches, divisions, positions, grades)"
```

---

## Task 4: Permission Helpers & Tests

**Files:**
- Create: `src/lib/permissions/index.ts`
- Create: `src/lib/permissions/index.test.ts`

- [ ] **Step 1: Tulis failing tests dulu**

```typescript
// src/lib/permissions/index.test.ts
import { describe, it, expect } from "vitest";
import { canAccess, ROLE_PERMISSIONS } from "./index";

describe("canAccess", () => {
  it("SUPER_ADMIN bisa akses semua resource", () => {
    expect(canAccess("SUPER_ADMIN", "master:read")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "payroll:write")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "employees:delete")).toBe(true);
  });

  it("TEAMWORK hanya bisa akses resource sendiri", () => {
    expect(canAccess("TEAMWORK", "performance:input")).toBe(true);
    expect(canAccess("TEAMWORK", "payroll:write")).toBe(false);
    expect(canAccess("TEAMWORK", "master:write")).toBe(false);
  });

  it("SPV bisa approve dan baca data divisinya", () => {
    expect(canAccess("SPV", "performance:approve")).toBe(true);
    expect(canAccess("SPV", "employees:read")).toBe(true);
    expect(canAccess("SPV", "payroll:finalize")).toBe(false);
  });

  it("HRD bisa override dan baca semua data HR", () => {
    expect(canAccess("HRD", "performance:override")).toBe(true);
    expect(canAccess("HRD", "employees:write")).toBe(true);
    expect(canAccess("HRD", "payroll:finalize")).toBe(false);
  });

  it("FINANCE bisa akses payroll", () => {
    expect(canAccess("FINANCE", "payroll:read")).toBe(true);
    expect(canAccess("FINANCE", "payroll:finalize")).toBe(true);
    expect(canAccess("FINANCE", "employees:delete")).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

```bash
pnpm vitest run src/lib/permissions/index.test.ts
```

Expected: FAIL — "Cannot find module './index'"

- [ ] **Step 3: Implementasi permission helpers**

```typescript
// src/lib/permissions/index.ts
import type { UserRole } from "@/types";

type Permission =
  | "master:read" | "master:write" | "master:delete"
  | "employees:read" | "employees:write" | "employees:delete"
  | "performance:input" | "performance:approve" | "performance:override"
  | "reviews:read" | "reviews:write"
  | "tickets:read" | "tickets:write" | "tickets:approve"
  | "payroll:read" | "payroll:write" | "payroll:finalize"
  | "settings:read" | "settings:write";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "master:read", "master:write", "master:delete",
    "employees:read", "employees:write", "employees:delete",
    "performance:input", "performance:approve", "performance:override",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write", "tickets:approve",
    "payroll:read", "payroll:write", "payroll:finalize",
    "settings:read", "settings:write",
  ],
  HRD: [
    "master:read", "master:write",
    "employees:read", "employees:write",
    "performance:override",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write", "tickets:approve",
    "payroll:read",
    "settings:read",
  ],
  FINANCE: [
    "employees:read",
    "payroll:read", "payroll:write", "payroll:finalize",
    "settings:read",
  ],
  SPV: [
    "master:read",
    "employees:read",
    "performance:approve",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:approve",
    "payroll:read",
  ],
  TEAMWORK: [
    "performance:input",
    "tickets:read", "tickets:write",
  ],
  MANAGERIAL: [
    "employees:read",
    "reviews:read",
    "tickets:read", "tickets:write",
    "payroll:read",
  ],
  PAYROLL_VIEWER: [
    "payroll:read",
  ],
};

export function canAccess(role: UserRole, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[]
): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
}
```

- [ ] **Step 4: Jalankan test, pastikan PASS**

```bash
pnpm vitest run src/lib/permissions/index.test.ts
```

Expected: PASS — 5 test suites passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions/
git commit -m "feat: add permission helpers with tests (canAccess, requireRole)"
```

---

## Task 5: Auth Middleware & Session Helpers

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/auth/session.ts`

- [ ] **Step 1: Buat session helper**

```typescript
// src/lib/auth/session.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 2: Buat middleware untuk proteksi route**

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isPublic = pathname === "/" || pathname.startsWith("/_next");

  if (!user && !isLoginPage && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Build check**

```bash
pnpm run build
```

Expected: Build berhasil. Jika ada type error, fix sebelum lanjut.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/lib/auth/
git commit -m "feat: add auth middleware and session helpers"
```

---

## Task 6: Login Page & Server Action

**Files:**
- Create: `src/lib/validations/auth.ts`
- Create: `src/server/actions/auth.ts`
- Create: `src/app/(auth)/login/LoginForm.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Buat Zod schema untuk login**

```typescript
// src/lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Buat server action login/logout**

```typescript
// src/server/actions/auth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email atau password salah" };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 3: Buat LoginForm client component**

```typescript
// src/app/(auth)/login/LoginForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setServerError(null);
    const fd = new FormData();
    fd.append("email", data.email);
    fd.append("password", data.password);
    const result = await loginAction(fd);
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hrd@perusahaan.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>
      {serverError && (
        <p className="text-sm text-red-500">{serverError}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Masuk..." : "Masuk"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Buat login page**

```typescript
// src/app/(auth)/login/page.tsx
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">HRIS Internal</h1>
          <p className="text-sm text-slate-500">Masuk ke dashboard HR</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Install shadcn/ui components yang dibutuhkan**

```bash
pnpm dlx shadcn@latest add button input label card badge separator
```

Expected: Component files muncul di `src/components/ui/`.

- [ ] **Step 6: Build check**

```bash
pnpm run build
```

Expected: Build berhasil tanpa error.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validations/auth.ts src/server/actions/auth.ts src/app/ src/components/
git commit -m "feat: add login page with Supabase Auth server action"
```

---

## Task 7: Dashboard Layout — Sidebar & Header

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Install tambahan shadcn components**

```bash
pnpm dlx shadcn@latest add avatar dropdown-menu tooltip
```

- [ ] **Step 2: Buat Sidebar component**

```typescript
// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BarChart3, Ticket,
  FileCheck, CreditCard, Settings, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "SPV", "TEAMWORK", "MANAGERIAL", "PAYROLL_VIEWER"],
  },
  {
    label: "Karyawan",
    href: "/employees",
    icon: <Users size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "FINANCE"],
  },
  {
    label: "Performa",
    href: "/performance",
    icon: <BarChart3 size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
  },
  {
    label: "Ticketing",
    href: "/tickets",
    icon: <Ticket size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
  },
  {
    label: "Review",
    href: "/reviews",
    icon: <FileCheck size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV"],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: <CreditCard size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"],
  },
  {
    label: "Master Data",
    href: "/master/branches",
    icon: <Database size={18} />,
    roles: ["SUPER_ADMIN", "HRD"],
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: <Settings size={18} />,
    roles: ["SUPER_ADMIN"],
  },
];

type SidebarProps = {
  userRole: UserRole;
};

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-base font-bold tracking-tight">HRIS Internal</h1>
        <p className="text-xs text-slate-400 mt-0.5">Human Resource System</p>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Buat Header component**

```typescript
// src/components/layout/Header.tsx
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HRD: "HRD",
  FINANCE: "Finance",
  SPV: "Supervisor",
  TEAMWORK: "Team Work",
  MANAGERIAL: "Managerial",
  PAYROLL_VIEWER: "Payroll Viewer",
};

type HeaderProps = {
  userEmail: string;
  userRole: string;
};

export default function Header({ userEmail, userRole }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">{userEmail}</p>
          <p className="text-xs text-slate-500">{ROLE_LABEL[userRole] ?? userRole}</p>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit">
            Keluar
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Buat dashboard layout**

```typescript
// src/app/(dashboard)/layout.tsx
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  const role = (userRole?.role ?? "TEAMWORK") as UserRole;

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email ?? ""} userRole={role} />
        <main className="flex-1 p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Buat dashboard home page**

```typescript
// src/app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-slate-500">Selamat datang di HRIS Internal.</p>
    </div>
  );
}
```

- [ ] **Step 6: Build check**

```bash
pnpm run build
```

Expected: Build berhasil.

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/ src/components/layout/
git commit -m "feat: add dashboard layout with role-based sidebar and header"
```

---

## Task 8: Zod Validations & Server Actions — Master Data

**Files:**
- Create: `src/lib/validations/master.ts`
- Create: `src/server/actions/branches.ts`
- Create: `src/server/actions/divisions.ts`
- Create: `src/server/actions/positions.ts`
- Create: `src/server/actions/grades.ts`

- [ ] **Step 1: Buat Zod schemas master data**

```typescript
// src/lib/validations/master.ts
import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Nama cabang wajib diisi").max(100),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const divisionSchema = z.object({
  name: z.string().min(1, "Nama divisi wajib diisi").max(100),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  branchId: z.string().uuid("Branch tidak valid").optional(),
  trainingPassPercent: z.string().default("80"),
  isActive: z.boolean().default(true),
});

export const positionSchema = z.object({
  name: z.string().min(1, "Nama jabatan wajib diisi").max(100),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  employeeGroup: z.enum(["MANAGERIAL", "TEAMWORK"]),
  isActive: z.boolean().default(true),
});

export const gradeSchema = z.object({
  name: z.string().min(1, "Nama grade wajib diisi").max(50),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type DivisionInput = z.infer<typeof divisionSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
```

- [ ] **Step 2: Buat server actions untuk branches**

```typescript
// src/server/actions/branches.ts
"use server";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema/master";
import { branchSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBranches() {
  return db.select().from(branches).orderBy(branches.name);
}

export async function createBranch(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    address: formData.get("address") as string || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await db.insert(branches).values(parsed.data);
  revalidatePath("/master/branches");
  return { success: true };
}

export async function updateBranch(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    address: formData.get("address") as string || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await db
    .update(branches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(branches.id, id));

  revalidatePath("/master/branches");
  return { success: true };
}

export async function deleteBranch(id: string) {
  await requireAuth();
  await db.delete(branches).where(eq(branches.id, id));
  revalidatePath("/master/branches");
  return { success: true };
}
```

- [ ] **Step 3: Buat server actions untuk divisions (pola sama)**

```typescript
// src/server/actions/divisions.ts
"use server";

import { db } from "@/lib/db";
import { divisions } from "@/lib/db/schema/master";
import { divisionSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getDivisions() {
  return db.select().from(divisions).orderBy(divisions.name);
}

export async function createDivision(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    branchId: formData.get("branchId") as string || undefined,
    trainingPassPercent: formData.get("trainingPassPercent") as string || "80",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = divisionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.insert(divisions).values(parsed.data);
  revalidatePath("/master/divisions");
  return { success: true };
}

export async function updateDivision(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    branchId: formData.get("branchId") as string || undefined,
    trainingPassPercent: formData.get("trainingPassPercent") as string || "80",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = divisionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.update(divisions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(divisions.id, id));
  revalidatePath("/master/divisions");
  return { success: true };
}

export async function deleteDivision(id: string) {
  await requireAuth();
  await db.delete(divisions).where(eq(divisions.id, id));
  revalidatePath("/master/divisions");
  return { success: true };
}
```

- [ ] **Step 4: Buat server actions untuk positions**

```typescript
// src/server/actions/positions.ts
"use server";

import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema/master";
import { positionSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPositions() {
  return db.select().from(positions).orderBy(positions.name);
}

export async function createPosition(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    employeeGroup: formData.get("employeeGroup") as "MANAGERIAL" | "TEAMWORK",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.insert(positions).values(parsed.data);
  revalidatePath("/master/positions");
  return { success: true };
}

export async function updatePosition(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    employeeGroup: formData.get("employeeGroup") as "MANAGERIAL" | "TEAMWORK",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.update(positions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(positions.id, id));
  revalidatePath("/master/positions");
  return { success: true };
}

export async function deletePosition(id: string) {
  await requireAuth();
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/master/positions");
  return { success: true };
}
```

- [ ] **Step 5: Buat server actions untuk grades**

```typescript
// src/server/actions/grades.ts
"use server";

import { db } from "@/lib/db";
import { grades } from "@/lib/db/schema/master";
import { gradeSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getGrades() {
  return db.select().from(grades).orderBy(grades.name);
}

export async function createGrade(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    description: formData.get("description") as string || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.insert(grades).values(parsed.data);
  revalidatePath("/master/grades");
  return { success: true };
}

export async function updateGrade(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    description: formData.get("description") as string || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.update(grades).set({ ...parsed.data, updatedAt: new Date() }).where(eq(grades.id, id));
  revalidatePath("/master/grades");
  return { success: true };
}

export async function deleteGrade(id: string) {
  await requireAuth();
  await db.delete(grades).where(eq(grades.id, id));
  revalidatePath("/master/grades");
  return { success: true };
}
```

- [ ] **Step 6: Build check**

```bash
pnpm run build
```

Expected: Build berhasil tanpa error.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validations/master.ts src/server/actions/
git commit -m "feat: add master data Zod validations and server actions (CRUD)"
```

---

## Task 9: Reusable DataTable Component

**Files:**
- Create: `src/components/tables/DataTable.tsx`

- [ ] **Step 1: Install shadcn table component**

```bash
pnpm dlx shadcn@latest add table dialog alert-dialog
```

- [ ] **Step 2: Buat reusable DataTable**

```typescript
// src/components/tables/DataTable.tsx
"use client";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: string;
  searchPlaceholder?: string;
};

export function DataTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Cari...",
}: DataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-3">
      {searchKey !== undefined && (
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
      )}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-slate-50">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-slate-400 py-10">
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-sm">
                      {flexRender(cell.column.columnDef.value, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{table.getFilteredRowModel().rows.length} data</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tables/DataTable.tsx src/components/ui/
git commit -m "feat: add reusable DataTable component with search and pagination"
```

---

## Task 10: Master Data Pages — Branches & Divisions

**Files:**
- Create: `src/app/(dashboard)/master/branches/page.tsx`
- Create: `src/app/(dashboard)/master/divisions/page.tsx`

- [ ] **Step 1: Buat halaman branches**

```typescript
// src/app/(dashboard)/master/branches/page.tsx
import { getBranches } from "@/server/actions/branches";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Branch } from "@/lib/db/schema/master";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Branch>[] = [
  { header: "Nama Cabang", accessorKey: "name" },
  { header: "Alamat", accessorKey: "address", cell: ({ getValue }) => getValue() || "-" },
  {
    header: "Status",
    accessorKey: "isActive",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "default" : "secondary"}>
        {getValue() ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
];

export default async function BranchesPage() {
  const data = await getBranches();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Cabang</h1>
      </div>
      <DataTable data={data} columns={columns} searchKey="name" searchPlaceholder="Cari cabang..." />
    </div>
  );
}
```

- [ ] **Step 2: Buat halaman divisions**

```typescript
// src/app/(dashboard)/master/divisions/page.tsx
import { getDivisions } from "@/server/actions/divisions";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Division } from "@/lib/db/schema/master";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Division>[] = [
  { header: "Nama Divisi", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  { header: "Min. Lulus Training", accessorKey: "trainingPassPercent", cell: ({ getValue }) => `${getValue()}%` },
  {
    header: "Status",
    accessorKey: "isActive",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "default" : "secondary"}>
        {getValue() ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
];

export default async function DivisionsPage() {
  const data = await getDivisions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Divisi</h1>
      </div>
      <DataTable data={data} columns={columns} searchKey="name" searchPlaceholder="Cari divisi..." />
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
pnpm run build
```

Expected: Build berhasil.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/master/
git commit -m "feat: add master data pages (branches, divisions)"
```

---

## Task 11: Master Data Pages — Positions & Grades

**Files:**
- Create: `src/app/(dashboard)/master/positions/page.tsx`
- Create: `src/app/(dashboard)/master/grades/page.tsx`

- [ ] **Step 1: Buat halaman positions**

```typescript
// src/app/(dashboard)/master/positions/page.tsx
import { getPositions } from "@/server/actions/positions";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/db/schema/master";
import type { ColumnDef } from "@tanstack/react-table";

const GROUP_LABEL: Record<string, string> = {
  MANAGERIAL: "Managerial",
  TEAMWORK: "Teamwork",
};

const columns: ColumnDef<Position>[] = [
  { header: "Nama Jabatan", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  {
    header: "Kelompok",
    accessorKey: "employeeGroup",
    cell: ({ getValue }) => (
      <Badge variant={getValue() === "MANAGERIAL" ? "outline" : "secondary"}>
        {GROUP_LABEL[getValue() as string] ?? getValue()}
      </Badge>
    ),
  },
  {
    header: "Status",
    accessorKey: "isActive",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "default" : "secondary"}>
        {getValue() ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
];

export default async function PositionsPage() {
  const data = await getPositions();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Master Jabatan</h1>
      <DataTable data={data} columns={columns} searchKey="name" searchPlaceholder="Cari jabatan..." />
    </div>
  );
}
```

- [ ] **Step 2: Buat halaman grades**

```typescript
// src/app/(dashboard)/master/grades/page.tsx
import { getGrades } from "@/server/actions/grades";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Grade } from "@/lib/db/schema/master";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Grade>[] = [
  { header: "Nama Grade", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  { header: "Deskripsi", accessorKey: "description", cell: ({ getValue }) => getValue() || "-" },
  {
    header: "Status",
    accessorKey: "isActive",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "default" : "secondary"}>
        {getValue() ? "Aktif" : "Nonaktif"}
      </Badge>
    ),
  },
];

export default async function GradesPage() {
  const data = await getGrades();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Master Grade</h1>
      <DataTable data={data} columns={columns} searchKey="name" searchPlaceholder="Cari grade..." />
    </div>
  );
}
```

- [ ] **Step 3: Build check & run tests**

```bash
pnpm run build && pnpm vitest run
```

Expected: Build OK, semua test pass.

- [ ] **Step 4: Final commit & push**

```bash
git add src/app/(dashboard)/master/positions/ src/app/(dashboard)/master/grades/
git commit -m "feat: add positions and grades master data pages"
git push origin main
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|---|---|
| Auth — Supabase Auth login | Task 5, 6 |
| Auth — middleware proteksi route | Task 5 |
| RBAC — user_roles table | Task 2 |
| RBAC — permission helper | Task 4 |
| Dashboard layout — sidebar role-based | Task 7 |
| Master branches | Task 3, 8, 10 |
| Master divisions | Task 3, 8, 10 |
| Master positions | Task 3, 8, 11 |
| Master grades | Task 3, 8, 11 |
| Drizzle schema | Task 2, 3 |
| Zod validation | Task 6, 8 |
| Server actions (no client logic) | Task 6, 8 |
| Tests untuk permission logic | Task 4 |

### Decisions & Assumptions

1. `user_roles.divisionId` null berarti akses semua divisi — diisi hanya untuk role SPV.
2. Drizzle schema `trainingPassPercent` disimpan sebagai varchar bukan numeric, karena nilainya bisa "70", "75", "80" — tidak perlu arithmetic di DB level.
3. Login form menggunakan `FormData` ke server action, bukan JSON fetch, sesuai pola Next.js App Router.
4. Dashboard layout mengambil role dari DB setiap render — bisa di-cache dengan `unstable_cache` jika perlu optimasi.
5. DataTable menggunakan client-side filtering — cukup untuk MVP, bisa diganti server-side filter jika data > 1000 baris.
6. Halaman master data saat ini read-only (list saja). Form create/edit akan ditambahkan di Plan 1b atau iterasi berikutnya sesuai prioritas.
