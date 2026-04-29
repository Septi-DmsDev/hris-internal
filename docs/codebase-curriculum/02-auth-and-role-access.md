# Auth dan Role Access

## 1. Tujuan Dokumen

Menjelaskan alur autentikasi dan otorisasi yang benar-benar dipakai code saat ini, termasuk:

- helper auth utama,
- role yang tersedia,
- scope akses SPV,
- server action yang sensitif,
- risiko jika role check terlewat.

## 2. File dan Folder Terkait

| File/Folder | Fungsi | Dipakai Oleh | Catatan |
|---|---|---|---|
| `src/proxy.ts` | redirect request berdasarkan session Supabase | semua route | pengganti `middleware.ts` pada Next.js 16 |
| `src/lib/supabase/server.ts` | server client Supabase dengan cookie bridge | auth helper, server action | memakai `NEXT_PUBLIC_SUPABASE_URL` dan anon key |
| `src/lib/supabase/client.ts` | browser client Supabase | client component jika perlu | saat ini jarang dipakai |
| `src/lib/auth/session.ts` | helper auth dan role | hampir semua action/page server | pusat role check aktual |
| `src/lib/permissions/index.ts` | matrix permission per role | test/helper | bukan enforcement utama |
| `src/lib/db/schema/auth.ts` | enum role dan tabel `user_roles` | auth/session, layout, action | menyimpan `divisionId` untuk scope SPV |
| `src/server/actions/auth.ts` | login dan logout | login form, header | memakai Supabase Auth |
| `src/app/(auth)/login/*` | UI login | user | form submit ke `loginAction()` |
| `src/app/(dashboard)/layout.tsx` | guard login + ambil role untuk sidebar/header | semua halaman dashboard | jika role row tidak ada, redirect ke login |

## 3. Alur Auth

```text
Request page
→ src/proxy.ts
→ cek cookie Supabase
→ jika belum login dan route private
→ redirect /login
→ jika login dan membuka /login
→ redirect /dashboard
```

```text
User submit login form
→ loginAction(formData)
→ validasi loginSchema
→ supabase.auth.signInWithPassword()
→ redirect /dashboard
```

```text
Server action dipanggil
→ requireAuth()
→ getUser()
→ getCurrentUserRoleRow()
→ optional checkRole([...])
→ query / mutation sesuai role
```

## 4. Penjelasan Fungsi Kunci

### `getUser()`

Path:
`src/lib/auth/session.ts`

Fungsi utama:
mengambil object user Supabase dari session cookie.

Input:
tidak ada.

Output:
`Supabase user | null`

Logika penting:

- membuat client Supabase server-side,
- memanggil `supabase.auth.getUser()`,
- mengembalikan `user` tanpa validasi role.

### `requireAuth()`

Path:
`src/lib/auth/session.ts`

Fungsi utama:
memastikan user login sebelum masuk ke action/page.

Input:
tidak ada.

Output:
`user`

Logika penting:

- memanggil `getUser()`,
- jika `null`, langsung `redirect("/login")`.

### `getCurrentUserRoleRow()`

Path:
`src/lib/auth/session.ts`

Fungsi utama:
mengambil record role aktual user dari tabel `user_roles`.

Input:
tidak ada.

Output:
`{ id, userId, role, divisionId }`

Logika penting:

- butuh user login,
- query ke tabel `user_roles` berdasarkan `user.id`,
- jika record tidak ada, user diarahkan ke `/login`.

Catatan:
fungsi ini adalah sumber data role nyata di runtime.

### `getCurrentUserRole()`

Path:
`src/lib/auth/session.ts`

Fungsi utama:
mengambil string role saja.

Output:
`"SUPER_ADMIN" | "HRD" | "FINANCE" | "SPV" | "TEAMWORK" | "MANAGERIAL" | "PAYROLL_VIEWER"`

### `checkRole(allowed)`

Path:
`src/lib/auth/session.ts`

Fungsi utama:
membatasi action berdasarkan role yang diizinkan.

Input:
array role yang boleh.

Output:
`null` bila lolos, atau `{ error: string }`

Logika penting:

- memanggil `getCurrentUserRoleRow()`,
- mencocokkan role dengan daftar `allowed`,
- jika tidak cocok, return object error.

Risiko/catatan:

- pesan error sekarang generik dan menyebut “HRD dan Super Admin”, walaupun dipakai juga untuk role lain.

## 5. Role yang Tersedia

Role berasal dari enum `user_role` di `src/lib/db/schema/auth.ts`.

| Role | Akses aktual di code | Catatan |
|---|---|---|
| `SUPER_ADMIN` | hampir semua modul | paling luas |
| `HRD` | master data, employee, review, ticket, payroll read, performance override | bisa lintas divisi |
| `FINANCE` | employee read, payroll read/write/finalize | fokus payroll/finance |
| `SPV` | employee read scoped, review scoped, ticket scoped, performance scoped | harus punya `divisionId` |
| `TEAMWORK` | secara permission punya `performance:input` dan `tickets:write` | di code aktual belum bisa menjalankan self-service performance/ticket secara penuh |
| `MANAGERIAL` | ticket read/write dan payroll read pada matrix permission | create ticket self-service juga masih diblokir di action |
| `PAYROLL_VIEWER` | payroll read | tidak bisa mutate |

## 6. Matrix Role ke Modul

| Modul | SUPER_ADMIN | HRD | FINANCE | SPV | TEAMWORK | MANAGERIAL | PAYROLL_VIEWER |
|---|---|---|---|---|---|---|---|
| Login/logout | ya | ya | ya | ya | ya | ya | ya |
| Dashboard | ya | ya | ya | ya | ya | ya | ya |
| Master Data | ya | ya | tidak | baca tidak langsung | tidak | tidak | tidak |
| Employee list/detail | ya | ya | ya | ya, scoped divisi | tidak | tidak | tidak |
| Performance workspace | ya | ya | tidak | ya, scoped divisi | tidak | tidak | tidak |
| Ticket read | ya | ya | tidak | ya, scoped divisi | terbatas ke tiket buatan sendiri jika mapping ada | sama | tidak |
| Ticket create | ya | ya | tidak | ya, scoped divisi | diblokir sementara | diblokir sementara | tidak |
| Ticket approve/reject | ya | ya | tidak | ya, scoped divisi | tidak | tidak | tidak |
| Review/incident | ya | ya | tidak | ya, scoped divisi | tidak | tidak | tidak |
| Training evaluation | ya | ya | tidak | ya, scoped divisi | tidak | tidak | tidak |
| Payroll | ya | baca | ya | tidak | tidak | tidak | baca |
| Finance dashboard | ya | baca | baca | tidak | tidak | tidak | baca |

## 7. Pola Scope SPV Berdasarkan `divisionId`

Scope SPV adalah pola paling penting di repo saat ini.

```text
SPV login
→ getCurrentUserRoleRow()
→ role = SPV, divisionId harus terisi
→ query data dibatasi dengan employees.divisionId = roleRow.divisionId
```

Contoh nyata:

- `getEmployees()` di `employees.ts`
- `getDashboardStats()` di `dashboard.ts`
- `getReviews()` dan `createReview()` di `reviews.ts`
- `getTickets()`, `createTicket()`, `approveTicket()`, `rejectTicket()` di `tickets.ts`
- `getTrainingEvaluations()` di `training.ts`
- `getPerformanceWorkspace()` dan approval activity di `performance.ts`

Jika `SPV` tidak punya `divisionId`, beberapa action akan:

- return error,
- atau mengembalikan data kosong,
- atau menolak approval.

## 8. Server Action yang Perlu Dicek Ketat

| File action | Kenapa sensitif |
|---|---|
| `src/server/actions/employees.ts` | mengubah profil, histori, dan jadwal kerja |
| `src/server/actions/performance.ts` | mengubah aktivitas harian, approval, dan monthly performance |
| `src/server/actions/tickets.ts` | mengubah status izin/sakit/cuti dan leave quota |
| `src/server/actions/reviews.ts` | mengubah review dan incident yang bisa berdampak ke payroll |
| `src/server/actions/training.ts` | mengubah status karyawan training/reguler/tidak lolos |
| `src/server/actions/payroll.ts` | period, snapshot, preview, adjustment, finalisasi, paid, lock |
| `src/server/actions/point-catalog.ts` | mengimpor versi master poin baru |

## 9. Risiko Jika Lupa Role Check

- SPV bisa melihat atau mengubah data di luar divisinya.
- Role non-payroll bisa membuka data salary dan THP.
- TEAMWORK/MANAGERIAL bisa mengakses data HRD lintas karyawan jika action tidak membatasi query.
- Finalisasi payroll bisa dijalankan pihak yang tidak berwenang.

## 10. Catatan Implementasi yang Perlu Review Lanjutan

### `status: sebagian`

Hal yang sudah ada:

- guard request di `src/proxy.ts`,
- auth helper server-side,
- role enum dan tabel role,
- scope SPV di banyak action,
- permission matrix helper,
- route dashboard login-protected.

Gap yang perlu dibangun:

- mapping langsung antara `auth.users` dan `employees`,
- self-access yang benar untuk `TEAMWORK` dan `MANAGERIAL`,
- RLS policy yang benar-benar versi repo,
- error message `checkRole()` yang lebih spesifik.

## 11. Catatan Inkonsistensi

- `references/implementation-playbook.md` menekankan RLS, tetapi repo tidak menunjukkan migration/policy RLS.
- `src/lib/permissions/index.ts` memberi `TEAMWORK` akses input performance dan ticket write, tetapi action performance/tickets aktual belum benar-benar membuka self-service untuk mereka.
