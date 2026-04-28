/**
 * Seed script — buat SUPER_ADMIN pertama
 * Jalankan: npx tsx scripts/seed-admin.ts
 *
 * Pastikan .env.local sudah diisi:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { userRoles } from "../src/lib/db/schema/auth";

const ADMIN_EMAIL = process.env.SEED_EMAIL ?? "admin@hris.internal";
const ADMIN_PASSWORD = process.env.SEED_PASSWORD ?? "Admin@12345";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    console.error("❌  Env vars belum lengkap. Pastikan .env.local sudah diisi:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL");
    console.error("   SUPABASE_SERVICE_ROLE_KEY");
    console.error("   DATABASE_URL");
    process.exit(1);
  }

  // 1. Buat user di Supabase Auth
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n🔐  Membuat user: ${ADMIN_EMAIL}`);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("⚠️   User sudah ada di Supabase Auth, lanjut ke user_roles...");
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing?.users.find((u) => u.email === ADMIN_EMAIL);
      if (!found) {
        console.error("❌  User tidak ditemukan.");
        process.exit(1);
      }
      await insertRole(databaseUrl, found.id);
    } else {
      console.error("❌  Gagal membuat user:", authError.message);
      process.exit(1);
    }
  } else {
    const userId = authData.user.id;
    console.log(`✅  User dibuat. UUID: ${userId}`);
    await insertRole(databaseUrl, userId);
  }
}

async function insertRole(databaseUrl: string, userId: string) {
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);

  console.log(`\n📋  Insert user_roles → SUPER_ADMIN`);

  try {
    await db
      .insert(userRoles)
      .values({ userId, role: "SUPER_ADMIN" })
      .onConflictDoNothing();
    console.log("✅  Role SUPER_ADMIN berhasil ditambahkan.");
  } catch (err) {
    console.error("❌  Gagal insert user_roles:", err);
  } finally {
    await client.end();
  }

  console.log("\n🎉  Selesai! Login dengan:");
  console.log(`   Email   : ${process.env.SEED_EMAIL ?? "admin@hris.internal"}`);
  console.log(`   Password: ${process.env.SEED_PASSWORD ?? "Admin@12345"}`);
  console.log("\n   ⚠️  Segera ganti password setelah login pertama.\n");
}

main();
