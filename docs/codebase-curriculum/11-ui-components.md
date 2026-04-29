# UI Components

## 1. Tujuan Dokumen

Menjelaskan komponen UI reusable yang benar-benar dipakai project, terutama untuk onboarding cepat saat membaca `src/app/(dashboard)`.

## 2. Arah Visual yang Terlihat di Code

Sumber:

- `src/app/globals.css`
- `components.json`
- `src/app/layout.tsx`

Karakter UI:

- font utama `Plus Jakarta Sans`,
- warna utama teal `#0d9488`,
- background dashboard `#f7f8f9`,
- sidebar navy `#0f172a`,
- komponen shadcn/ui memakai CSS variable.

## 3. File dan Komponen Penting

| File | Fungsi | Modul yang memakai | Catatan |
|---|---|---|---|
| `src/components/layout/Sidebar.tsx` | navigasi dashboard berbasis role | semua dashboard | grup `main` dan `admin` |
| `src/components/layout/Header.tsx` | header, badge role, logout | semua dashboard | logout via form action |
| `src/components/tables/DataTable.tsx` | tabel reusable | hampir semua modul | search + pagination |
| `src/components/ui/button.tsx` | button shadcn | semua form/action | variant umum dipakai |
| `src/components/ui/input.tsx` | input text/date/number | semua form | wrapper sederhana |
| `src/components/ui/label.tsx` | label form | login form dan beberapa dialog | wrapper Radix |
| `src/components/ui/badge.tsx` | badge status | dashboard, employee, tickets, payroll | indikator status |
| `src/components/ui/dialog.tsx` | modal form | master, employee, performance, tickets, reviews, payroll, training | modal utama |
| `src/components/ui/alert-dialog.tsx` | confirm destructive action | employee/master tables | hapus data |
| `src/components/ui/tabs.tsx` | switch antar panel | performance, reviews | tab utama modul |
| `src/components/ui/table.tsx` | primitive table | DataTable | wrapper TanStack render |

## 4. Layout Dashboard

### `src/app/(dashboard)/layout.tsx`

Fungsi:

- memastikan user login,
- mengambil role dari `user_roles`,
- merender `Sidebar` dan `Header`,
- menyediakan background dashboard yang konsisten.

### `src/components/layout/Sidebar.tsx`

Fungsi:
navigasi modul berdasarkan role.

Props penting:

- `userRole`

Logika penting:

- setiap item punya `roles` dan `group`,
- active state diambil dari `usePathname()`,
- role badge tampil di footer sidebar.

Modul yang memakai:
semua route dalam `(dashboard)`.

### `src/components/layout/Header.tsx`

Fungsi:
menampilkan identitas user dan tombol keluar.

Props penting:

- `userEmail`
- `userRole`

Logika penting:

- avatar diambil dari 2 huruf awal email,
- logout memakai `<form action={logoutAction}>`.

## 5. DataTable Reusable

### `src/components/tables/DataTable.tsx`

Fungsi:
wrapper generik di atas TanStack Table.

Props penting:

- `data`
- `columns`
- `searchKey`
- `searchPlaceholder`

Fitur:

- filter sederhana satu kolom,
- pagination default 20 row,
- empty state,
- footer jumlah data,
- tombol prev/next.

Modul yang memakai:

- employees
- master branches/divisions/positions/grades/work-schedules
- performance
- tickets
- reviews
- payroll
- finance

Contoh pemakaian:

```tsx
<DataTable
  data={tickets}
  columns={columns}
  searchKey="employeeName"
  searchPlaceholder="Cari karyawan..."
/>
```

## 6. Tabs

### `src/components/ui/tabs.tsx`

Fungsi:
wrapper Radix Tabs dengan styling shadcn.

Komponen:

- `Tabs`
- `TabsList`
- `TabsTrigger`
- `TabsContent`

Modul yang memakai:

- `PerformanceCatalogClient.tsx`
- `ReviewsClient.tsx`

Contoh nyata:

```text
Performance:
Aktivitas Harian
Performa Bulanan
Katalog Poin

Reviews:
Review Karyawan
Incident Log
```

## 7. Dialog

### `src/components/ui/dialog.tsx`

Fungsi:
modal utama untuk form input/edit/proses.

Komponen penting:

- `Dialog`
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogFooter`

Modul yang memakai:

- employee create/edit
- semua master CRUD
- activity performance
- import workbook
- ticket create/approve/reject
- review/incident create
- training decision
- payroll period/adjustment/KPI/salary config

### `src/components/ui/alert-dialog.tsx`

Fungsi:
konfirmasi aksi destruktif.

Modul yang memakai:

- hapus employee,
- hapus branch/division/position/grade/work schedule.

## 8. Badge dan Status Indicator

### `src/components/ui/badge.tsx`

Fungsi:
indikator status ringkas.

Variant umum yang terlihat:

- `default`
- `secondary`
- `destructive`
- `outline`

Contoh penggunaan:

- status payroll period,
- status employee aktif/nonaktif,
- status activity,
- status ticket,
- kategori role,
- kategori review/incident.

## 9. Form Elements

### `src/components/ui/button.tsx`

Props penting:

- `variant`
- `size`
- `asChild`

Pola pemakaian:

- tombol submit action,
- tombol link dengan `asChild`,
- tombol destructive pada reject/hapus.

### `src/components/ui/input.tsx`

Fungsi:
input reusable untuk text, number, date, email, password.

Modul yang memakai:
hampir semua dialog dan login form.

### `src/components/ui/label.tsx`

Fungsi:
label form sederhana.

Pemakaian paling jelas:
`src/app/(auth)/login/LoginForm.tsx`

## 10. Catatan Pola UI Per Modul

| Modul | Pola UI utama |
|---|---|
| Master data | DataTable + Dialog + AlertDialog |
| Employees | DataTable + Dialog besar + detail page histori |
| Performance | Tabs + DataTable + Dialog import/activity/monthly |
| Tickets | DataTable + create dialog + decision dialog |
| Reviews | Tabs + DataTable + dialog create review/incident |
| Training | card list + decision dialog |
| Payroll | summary cards + DataTable + banyak dialog |
| Finance | summary cards + DataTable read-only |

## 11. Hal yang Perlu Diperhatikan Developer

- repo belum punya folder `components/forms` aktif, jadi form besar masih tersebar di client component modul.
- banyak client component cukup besar; jika modul berkembang, ekstraksi subcomponent form dan table section akan membantu maintenance.
- karena banyak status string dipetakan manual ke badge/label di client, perubahan enum perlu dicek di UI juga.
