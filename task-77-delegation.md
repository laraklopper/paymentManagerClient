# Task 77 — Klopper Admin Frontend (Delegation Brief)

**Task:** Build the "Klopper Admin" web frontend in the `web/` directory of this monorepo.

**Important constraints for this engagement:**
- **Do NOT connect to the backend API** — it is still being built. Use mock data throughout.
- **Do NOT deploy to Vercel** — deployment will be handled separately once the backend is ready.
- Deliver a fully working, locally runnable Next.js app with realistic mock data.

---

## Project Context

Klopper Admin is an internal payment management tool used by two people:

- **Ricky** (admin role) — approves and authorises payments
- **Lara** (loader role) — loads approved payments into the bank system

Payments flow through these statuses: `pending → approved → loaded → authorised` (or `rejected` at any point by Ricky).

The frontend is a pure HTTP client — all data will eventually come from a Cloud Run REST API. For now, replace every API call with hardcoded mock data.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16.1.6 (App Router) |
| Styling | Tailwind CSS v4 |
| Auth | `jose` JWT + HttpOnly cookie |
| Language | TypeScript |
| Package manager | npm (project root uses npm) |
| Location | `web/` directory (monorepo sibling to `src/`) |

---

## Directory Structure

Bootstrap with `npx create-next-app@16.1.6 web` using these options:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- `src/` directory: No (keep it flat under `web/`)

Expected structure:

```
web/
├── app/
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Redirect to /login or /dashboard
│   ├── login/
│   │   └── page.tsx                      # Login page
│   └── dashboard/
│       ├── layout.tsx                    # Dashboard layout (nav sidebar)
│       ├── page.tsx                      # Dashboard overview (redirect to /payments)
│       ├── payments/
│       │   ├── page.tsx                  # Payments list
│       │   └── [id]/
│       │       └── page.tsx              # Payment detail
│       ├── beneficiaries/
│       │   └── page.tsx                  # Beneficiaries list
│       ├── bank-accounts/
│       │   └── page.tsx                  # Bank accounts list (Ricky only)
│       └── emails/
│           └── page.tsx                  # Email records list (Ricky only)
├── lib/
│   ├── auth.ts                           # JWT sign/verify helpers (jose)
│   ├── mock-data.ts                      # All mock data in one place
│   └── api-client.ts                     # API client (returns mock data for now)
├── middleware.ts                          # Auth guard on /dashboard routes
├── .env.local.example                    # Document required env vars
├── package.json
└── tsconfig.json
```

---

## Authentication

### How it works

- Two hardcoded users loaded from environment variables
- Login form POSTs credentials to a Next.js API route (`/api/auth/login`)
- On success: sign a JWT, set it as an HttpOnly cookie named `session`
- Middleware reads the cookie and redirects unauthenticated requests to `/login`
- Role is stored in the JWT payload (`role: 'admin' | 'loader'`)

### JWT Cookie

Use `jose` (already a well-known library):

```bash
npm install jose
```

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken(payload: { email: string; role: 'admin' | 'loader' }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload as { email: string; role: 'admin' | 'loader' }
}
```

### Login API route

```typescript
// app/api/auth/login/route.ts
// - Read RICKY_EMAIL, RICKY_PASSWORD_HASH, LARA_EMAIL, LARA_PASSWORD_HASH from env
// - Compare submitted password against bcrypt hash (use 'bcryptjs' npm package)
// - On match: sign JWT, set HttpOnly cookie, return 200
// - On failure: return 401
```

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### Middleware

```typescript
// middleware.ts
// Protect all /dashboard routes. Redirect to /login if no valid session cookie.
// Pass role to downstream via a request header (x-user-role, x-user-email).
```

### `.env.local.example`

```
JWT_SECRET=change-me-32-chars-minimum
RICKY_EMAIL=ricky@klopper.co.za
RICKY_PASSWORD_HASH=<bcrypt hash of password>
LARA_EMAIL=lara@example.com
LARA_PASSWORD_HASH=<bcrypt hash of password>
# These will be needed later when connecting to the backend:
# NEXT_PUBLIC_API_URL=https://payment-manager-xxx.a.run.app
# ADMIN_API_KEY=<secret>
```

For local development, generate a bcrypt hash with node:

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('testpassword', 10))"
```

---

## Mock Data

Put all mock data in `lib/mock-data.ts`. The shapes below mirror the real API response structures exactly — this makes the eventual backend swap a one-file change in `lib/api-client.ts`.

### Payment

```typescript
export type PaymentStatus = 'pending' | 'approved' | 'loaded' | 'authorised' | 'rejected'

export interface Payment {
  id: string
  paymentId: string               // e.g. "PAY-001"
  status: PaymentStatus
  amount: number                  // ZAR, e.g. 12500.00
  fromBankAccount: { id: string; name: string }
  toBeneficiary: { id: string; name: string }
  beneficiaryReference?: string
  payerReference?: string
  beneficiaryPOPEmail?: string
  payerPOPEmail?: string
  isNewBeneficiary: boolean
  notes?: string
  linkedEmailId?: string
  dateApproved?: string           // ISO date string
  createdAt: string
  updatedAt: string
}
```

### PaymentEmail

```typescript
export interface PaymentEmail {
  id: string
  name: string                    // Email subject / identifier
  senderEmail: string
  emailBody: string
  receivedDate: string            // ISO date string
  processed: boolean
  gcsAttachmentPaths: string[]    // e.g. ["payments/2026-feb/invoice.pdf"]
}
```

### Beneficiary

```typescript
export type BeneficiaryType = 'standard' | 'preloaded'

export interface Beneficiary {
  id: string
  name: string
  type: BeneficiaryType
  loadedOnAbsa: boolean
  beneficiaryNumber?: number
  // Standard fields:
  bankName?: string
  bankAccountNumber?: string
  branchCode?: string
  // Preloaded fields:
  institutionReference?: string
  // Defaults:
  defaultBeneficiaryReference?: string
  defaultPayerReference?: string
  defaultBeneficiaryPOPEmail?: string
  defaultPayerPOPEmail?: string
}
```

### BankAccount

```typescript
export interface BankAccount {
  id: string
  name: string                    // e.g. "Klopper Family Trust — ABSA"
  accountNumber: string
  branchCode: string
}
```

### Sample mock data (minimum viable set)

Create at least:
- 2 bank accounts
- 5 beneficiaries (mix of standard and preloaded)
- 8–10 payments (spread across all statuses)
- 4 email records (2 processed, 2 unprocessed)

---

## API Client (Mock)

```typescript
// lib/api-client.ts
// All functions return mock data with a small artificial delay (setTimeout ~300ms)
// to simulate network latency and make loading states visible.

import { payments, beneficiaries, bankAccounts, emails } from './mock-data'

export async function getPayments(filters?: { status?: string }) { ... }
export async function getPayment(id: string) { ... }
export async function approvePayment(id: string) { ... }
export async function rejectPayment(id: string) { ... }
export async function markPaymentLoaded(id: string) { ... }
export async function authorisePayment(id: string) { ... }
export async function getBeneficiaries() { ... }
export async function createBeneficiary(data: unknown) { ... }
export async function getBankAccounts() { ... }
export async function getEmails() { ... }
```

The action functions (`approve`, `reject`, `loaded`, `authorise`) should mutate the in-memory mock state so the UI updates correctly within a session — this validates the UI flow without a real backend.

---

## Pages

### `/login`

- Email + password form
- Submit calls `/api/auth/login`
- Redirect to `/dashboard/payments` on success
- Show error message on failure
- Clean, minimal design (not a consumer app — internal tool)

### `/dashboard` (layout)

Sidebar navigation with:
- Payments (both roles)
- Beneficiaries (both roles)
- Bank Accounts (Ricky / admin only — hide from Lara)
- Email Records (Ricky / admin only — hide from Lara)
- Logout button (calls `/api/auth/logout`, clears cookie, redirects to `/login`)

Show current user's name/email and role in the sidebar footer.

### `/dashboard/payments`

Table of all payments. Columns:
- Payment ID
- Beneficiary name
- Amount (formatted as ZAR, e.g. `R 12 500.00`)
- Status (badge with colour coding)
- Date

Filter tabs or dropdown by status: All | Pending | Approved | Loaded | Authorised | Rejected

Clicking a row navigates to `/dashboard/payments/[id]`.

### `/dashboard/payments/[id]`

Full payment detail view. Show all fields.

**Role-gated action buttons:**

| Button | Visible to | Enabled when status is |
|--------|-----------|------------------------|
| Approve | Ricky (admin) | `pending` |
| Reject | Ricky (admin) | `pending`, `loaded` |
| Mark as Loaded | Lara (loader) | `approved` |
| Authorise | Ricky (admin) | `loaded` |

Each action button calls the appropriate mock API function, then refreshes the payment data and shows a success message. Disable/hide buttons that don't apply to the current status.

### `/dashboard/beneficiaries`

Table of all beneficiaries. Columns:
- Name
- Type (standard / preloaded — badge)
- Bank / Institution details (account number for standard, institution ref for preloaded)
- Loaded on ABSA (tick/cross)

Include a simple "Add Beneficiary" button that opens a modal or expands a form inline. The form should support both types (show/hide fields based on type selection). On submit, call `createBeneficiary()` from the mock API client.

### `/dashboard/bank-accounts`

Simple table. Columns: Name, Account Number, Branch Code.

**Ricky/admin only.** Redirect Lara to `/dashboard/payments` if she tries to access this page (check role from session in a server component or via middleware header).

### `/dashboard/emails`

Table of email records. Columns:
- Name / subject
- Sender
- Received Date
- Processed (tick/cross)
- Attachments count

**Ricky/admin only.** Same access control as bank accounts.

---

## Design Guidelines

This is an internal desktop tool. Prioritise:
- **Clarity** over decoration
- **Density** — show useful data without excess whitespace
- **Consistency** — same patterns across all pages (tables, badges, buttons)

Status badge colour scheme:
- `pending` → amber/yellow
- `approved` → blue
- `loaded` → purple
- `authorised` → green
- `rejected` → red

Currency: Always display ZAR amounts as `R X,XXX.XX` (e.g. `R 12,500.00`).

No mobile breakpoints needed — this is a desktop-only internal tool.

---

## What to Deliver

1. A working Next.js app in the `web/` directory of this repo
2. `npm run dev` starts it on `http://localhost:3000`
3. Login works for both Ricky and Lara (with test credentials documented in `web/.env.local.example`)
4. All pages render correctly with mock data
5. Action buttons on payment detail update state in-memory and reflect in the UI
6. Role-based access control works (Lara can't see Bank Accounts or Emails)
7. Clean, professional UI using Tailwind

---

## What NOT to Do

- Do **not** connect to `https://payment-manager-bwuwutqgga-bq.a.run.app` or any real backend
- Do **not** set up `NEXT_PUBLIC_API_URL` or `ADMIN_API_KEY` — these are for later
- Do **not** deploy to Vercel — run locally only
- Do **not** modify anything in `src/` (the Cloud Run backend code) or `gas/` (Google Apps Script)
- Do **not** add Turso or any database dependency to `web/` — it is a pure HTTP client

---

## Running the App

```bash
cd web
cp .env.local.example .env.local
# Fill in JWT_SECRET and generate bcrypt hashes for both users
npm install
npm run dev
```

The app should be accessible at `http://localhost:3000`.
