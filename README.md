# personal-website

Static personal site (papers, presentations, apps) plus a login-gated
portfolio tracker.

## Stack

- Static HTML/CSS on **Cloudflare Pages** (free).
- **Supabase** for auth + Postgres (free tier: 50k MAU, 500 MB DB, unlimited API requests).
- Portfolio rows are protected by Postgres **Row Level Security**: users see
  only their own holdings, admins see and edit everyone's.
- Stock quotes come from a Supabase Edge Function (proxy for Yahoo Finance,
  avoids browser CORS).

```
Browser (Cloudflare Pages)
  └─ supabase-js ──▶ Supabase Auth
                 └─ Postgres + RLS (profiles, holdings)
                 └─ Edge Function: stock-price
```

## Setup

### 1. Create the Supabase project

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Settings → API**, copy the Project URL and the `anon` public key.

### 2. Point the site at it

Edit [`assets/config.js`](assets/config.js):

```js
window.SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

The `anon` key is safe to commit — RLS enforces access. Never put the
`service_role` key in client code.

### 3. Create your account and make it admin

1. Visit `/tracker/`, use **Create an account** to sign up (email + password).
2. In Supabase **SQL Editor**, promote yourself:

   ```sql
   update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
   ```

3. Sign out and back in. The tracker now shows every user's holdings with
   editable share counts.

Public signups are open by default. To make it invite-only, turn off
**Authentication → Providers → Email → Enable signups** in Supabase.

### 4. Deploy the stock-price function

Install the Supabase CLI, then:

```sh
supabase functions deploy stock-price
```

### 5. (Optional) Load existing holdings

After the users have signed up, run
[`supabase/seed.example.sql`](supabase/seed.example.sql) in the SQL Editor.

### 6. Keep the free project awake

Supabase pauses free projects after ~1 week of inactivity. The
[keep-alive workflow](.github/workflows/keepalive.yml) pings the REST API
daily. Add repository secrets:

- `SUPABASE_URL` — same project URL
- `SUPABASE_ANON_KEY` — same anon key

Note: GitHub pauses scheduled workflows after 60 days without repo activity;
push or run the workflow manually to re-enable it.

### 7. Deploy

Static hosting only — point Cloudflare Pages at this repo. No Workers or D1
needed.

## Security notes

- `archive/users.csv` and `archive/portfolios.csv` hold the old data with
  **plaintext passwords**. Treat those passwords as compromised and change
  them. If the Pages publish directory is the repo root, files under
  `archive/` are still reachable at `/archive/...`; configure a publish
  directory (or delete the files) to be safe.
- Remove these files from git history if the repo has ever been public.
- Admin access is enforced in the database via RLS, not just in the UI.
