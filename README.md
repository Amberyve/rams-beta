# RAMS v2 — ISAT U Research Asset Management System

A modern rebuild of the original PHP/MySQL RAMS as a full-stack web app:

| Layer     | Technology                                                          |
|-----------|---------------------------------------------------------------------|
| Front end | Next.js 14 (App Router), React, TypeScript, Tailwind CSS            |
| Back end  | Supabase — PostgreSQL, Row Level Security, Auth, Storage            |
| Server    | Next.js route handler `/api/users` (admin account management)       |
| Hosting   | Vercel (app) + Supabase (database, auth, file storage)              |

## What's inside

- **Dashboard** — counts for every asset type, research completion rate, latest research, researcher shortcuts.
- **Intellectual Property** — Patents, Trademarks, Copyrights.
- **People** — Faculty Researcher directory with profile pages (photo, education, specializations, research list), Faculty Research, Graduate School Students.
- **Resources** — Laboratories, Services (with ₱ rates), Equipment (linked to a lab).
- **User Accounts** (admin only) — create accounts, change roles, reset passwords, delete.
- Every list has instant search, filters, sortable columns, pagination, CSV export, add/edit forms with validation, and delete confirmation. Works on phones.

### Roles (same as the old system)

| Role    | View & export | Add / edit | Delete | Manage users |
|---------|:---:|:---:|:---:|:---:|
| `admin` | ✓ | ✓ | ✓ | ✓ |
| `rsd`   | ✓ | ✓ |   |   |
| `user`  | ✓ |   |   |   |

These rules are enforced **in the database** (RLS policies), not only in the UI.

---

## Deploy in 4 steps

### 1 · Create the Supabase project
1. Go to <https://supabase.com> → **New project** (choose region *Southeast Asia (Singapore)*).
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, click **Run**.
3. *(Optional)* Run `supabase/seed.sql` the same way to load sample records.
4. **Authentication → Sign In / Providers → Email**: turn **off** “Allow new users to sign up” (accounts are created by the admin).

### 2 · Create the first administrator
1. **Authentication → Users → Add user → Create new user** — enter your email and a password, tick *Auto Confirm User*.
2. In **SQL Editor** run (with your email):
   ```sql
   update public.profiles set role = 'admin', full_name = 'Your Name'
   where email = 'you@isatu.edu.ph';
   ```
From then on, create everyone else from the app's **User Accounts** page.

### 3 · Push the code to GitHub
```bash
git init && git add . && git commit -m "RAMS v2"
git remote add origin https://github.com/<you>/rams.git
git push -u origin main
```

### 4 · Deploy on Vercel
1. <https://vercel.com/new> → import the GitHub repo (framework is auto-detected as Next.js).
2. Add **Environment Variables** (Supabase → Project Settings → API):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / secret key — **never** share or prefix with `NEXT_PUBLIC_` |

3. Click **Deploy**.
4. Back in Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (e.g. `https://rams-isatu.vercel.app`) and add `https://rams-isatu.vercel.app/auth/callback` to **Redirect URLs** so “Forgot password” emails work.

## Run locally
```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev                  # http://localhost:3000
```
Requires Node.js 18.18 or newer.

## Moving data from the old MySQL database
The tables map one-to-one (old → new): `invention → patents`, `trademark → trademarks`, `copyright → copyrights`,
`experts (+ areas, ed_quali) → researchers`, `researches → research_projects`, `grad → graduate_students`,
`lab → laboratories`, `services → services`, `equipment → equipment`. Export each old table to CSV from phpMyAdmin,
rename the columns to match, and import with **Supabase → Table Editor → Import data from CSV**.
Old plain-text passwords in the `user` table are **not** migrated — recreate those accounts in the app.

## Project structure
```
app/
  login/                 sign-in page
  (app)/                 signed-in area (sidebar layout)
    page.tsx             dashboard
    patents/ trademarks/ copyrights/ research/ graduates/ laboratories/ services/ equipment/
    researchers/         directory + [id] profile
    users/               admin account management
    account/             change name / password
  api/users/route.ts     admin-only user API (uses service role key)
  auth/callback/         handles email links (password reset)
components/              UI: app shell, generic ResourceManager table, forms, modals
lib/resources.ts         ← one config object per module: columns, form fields, filters
supabase/schema.sql      tables, RLS policies, storage bucket, stats function
supabase/seed.sql        optional sample data
```
To add a field to a module, add the column in Supabase and one line in `lib/resources.ts` — the table, form, view panel and CSV export pick it up automatically.
