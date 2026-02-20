# Local Login Guide

This document explains how authentication works locally and how to log in during development.

---

## Dev Credentials

Two users are pre-configured in `.env.local`:

| Name  | Email                  | Password    | Role     | What they can do                              |
|-------|------------------------|-------------|----------|-----------------------------------------------|
| Ricky | ricky@klopper.co.za    | `admin123`  | `admin`  | Approve and reject payments                   |
| Lara  | lara@klopper.co.za     | `loader123` | `loader` | Mark payments as loaded and authorise them    |

> These are **development-only** credentials. Change both passwords before deploying.

---

## How to Log In

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000/login](http://localhost:3000/login) in your browser.
3. Enter an email and password from the table above.
4. On success you are redirected to `/dashboard/payments`.

---

## How Authentication Works (end-to-end)

```
Browser                     Next.js Server
  │                               │
  │  POST /api/auth/login         │
  │  { email, password }  ──────► │
  │                               │  1. Look up user by email in env vars
  │                               │  2. bcrypt.compare(password, stored hash)
  │                               │  3. If match → signToken({ email, role })
  │                               │     JWT signed with JWT_SECRET, expires 8h
  │  ◄──────────────────────────  │
  │  Set-Cookie: session=<JWT>    │
  │  Redirect → /dashboard        │
  │                               │
  │  GET /dashboard/payments      │
  │  Cookie: session=<JWT> ─────► │  middleware.ts runs first:
  │                               │  4. verifyToken(cookie) → { email, role }
  │                               │  5. Sets x-user-role and x-user-email headers
  │                               │  6. Passes request through to the page
  │  ◄──────────────────────────  │
  │  Dashboard page               │
```

### Step-by-step breakdown

| Step | File | What happens |
|------|------|--------------|
| 1 | `app/login/page.tsx` | User fills in the form and submits |
| 2 | `app/api/auth/login/route.ts` | Email matched against `RICKY_EMAIL` / `LARA_EMAIL` env vars |
| 3 | `app/api/auth/login/route.ts` | Password compared to the stored bcrypt hash |
| 4 | `lib/auth.ts` → `signToken()` | JWT created with `{ email, role }`, signed with `JWT_SECRET` |
| 5 | `app/api/auth/login/route.ts` | JWT written into an `httpOnly` cookie named `session` (8h expiry) |
| 6 | `middleware.ts` | Every `/dashboard/*` request verifies the cookie via `verifyToken()` |
| 7 | `middleware.ts` | User identity forwarded as `x-user-role` and `x-user-email` headers |

---

## Environment Variables

Defined in `.env.local` (never committed to git):

| Variable             | Description                                      |
|----------------------|--------------------------------------------------|
| `JWT_SECRET`         | Random string used to sign and verify JWTs       |
| `RICKY_EMAIL`        | Admin user's email address                       |
| `RICKY_PASSWORD_HASH`| bcrypt hash of Ricky's password (cost factor 10) |
| `LARA_EMAIL`         | Loader user's email address                      |
| `LARA_PASSWORD_HASH` | bcrypt hash of Lara's password (cost factor 10)  |

### Changing a password

Generate a new bcrypt hash with Node:
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('your-new-password', 10))"
```
Paste the output into `.env.local` and restart the dev server.

### Generating a new JWT secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Session Cookie

The `session` cookie is set with the following security flags:

| Flag       | Value                              | Why                                          |
|------------|------------------------------------|----------------------------------------------|
| `httpOnly` | `true`                             | JavaScript cannot read it (XSS protection)   |
| `secure`   | `true` in production, `false` locally | Only sent over HTTPS in production        |
| `sameSite` | `lax`                              | Sent on same-site navigations, blocks CSRF   |
| `maxAge`   | 28 800 seconds (8 hours)           | Matches a working day; expires automatically |
| `path`     | `/`                                | Valid for all routes                         |

---

## What Happens on Invalid / Expired Tokens

If the JWT is tampered with, expired, or the `JWT_SECRET` changes, `verifyToken()` throws.
The middleware catches this, **deletes the stale cookie**, and redirects the user to `/login`.

---

## Notes

- Login does **not** use `mock-data.ts` — credentials live entirely in environment variables.
- There is no user database; adding a third user requires adding new env vars and updating `route.ts`.
- The `mock-data.ts` store (payments, beneficiaries, emails) is separate and loads independently of auth.