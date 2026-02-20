# How the Payment Manager Works

This document explains the payment-manager codebase in plain language — what it does, how the pieces connect, and why it is built the way it is.

---

## What the System Does

Ricky forwards payment-related emails (invoices, bills) to his sister Lara. This system watches for those emails, reads the attached PDF invoices automatically using AI, and creates structured payment records in Notion. Lara and Ricky then work through an approval workflow entirely inside Notion — no extra apps needed.

The system handles the tedious part: reading invoices, matching beneficiaries, and capturing all the payment details. The humans handle the judgement calls: approving, loading into the bank, and authorising.

---

## The Big Picture

```
Ricky forwards email
        ↓
Gmail (Lara's inbox)
        ↓  every 5 minutes
Google Apps Script
        ↓  uploads PDFs to Cloud Storage
        ↓  creates row in Notion
Notion Payment Emails database  (Processed = false)
        ↓  fires webhook
Cloud Function Proxy  (checks signature)
        ↓  forwards with auth token
Cloud Run  (payment-manager service)
        ↓
   ┌────┴────┐
Agent 1    Agent 2
Extract    Decide
PDFs       & Create
   └────┬────┘
        ↓
Notion Payments database  (status = pending)
        ↓  fires webhook
Email notification to Lara
        ↓  Lara loads into bank
        ↓  status = loaded
Email notification to Ricky
        ↓  Ricky authorises
        status = authorised ✓
```

---

## Step-by-Step Walkthrough

### Step 1 — Email Arrives in Gmail

Ricky forwards an invoice email to Lara's Gmail account. The email typically has a PDF attachment (the invoice).

### Step 2 — Google Apps Script Picks It Up

A script running in Google Apps Script checks Gmail every 5 minutes for unread emails from `ricky@klopper.co.za`. When it finds one it:

1. Reads the email subject, body, and date
2. Uploads any PDF attachments to a private Google Cloud Storage bucket (`asdf-agent-storage`) under the path `payments/{yyyy-mmm}/filename.pdf`
3. Creates a new row in the **Payment Emails** Notion database with `Processed = false` and the GCS file paths recorded
4. Marks the Gmail thread as read

Code lives in [gas/Code.js](gas/Code.js). It auto-deploys via GitHub Actions when changes are pushed to `gas/`.

### Step 3 — Notion Fires a Webhook

When a new row appears in the Payment Emails database, Notion sends an HTTP webhook to a public URL.

### Step 4 — Cloud Function Proxy Verifies the Request

The webhook hits a Cloud Function (`notion-webhook-proxy`) before anything else. This function:

- Checks the HMAC-SHA256 signature on the request using `NOTION_VERIFICATION_TOKEN`
- Rejects anything that doesn't match (prevents fake webhook calls)
- Adds a Google Cloud identity token to the forwarded request
- Sends the verified request on to Cloud Run

This proxy exists because Cloud Run requires authentication, but Notion webhooks are sent without credentials. The proxy bridges the two.

Code lives in [functions/notion-webhook-proxy/src/index.ts](functions/notion-webhook-proxy/src/index.ts).

### Step 5 — Cloud Run Receives the Request

The main application (`payment-manager`) runs on Google Cloud Run. It is an Express.js HTTP server with two routes:

- `GET /health` — Cloud Run uses this to check the service is alive
- `POST /api/webhooks/notion` — receives all Notion webhooks

The webhook handler in [src/api/webhooks/notion.ts](src/api/webhooks/notion.ts) inspects which Notion database triggered the event:

- **Payment Emails database** → start the extraction pipeline
- **Payments database** → send a status-change notification email

### Step 6 — Email Processor Orchestrates the Agents

[src/services/email-processor.ts](src/services/email-processor.ts) is the orchestrator. It:

1. Queries Notion for all emails where `Processed = false`
2. Checks a cache to avoid processing the same email twice
3. For each unprocessed email, runs Agent 1 then Agent 2
4. Marks the email `Processed = true` when done
5. If anything fails, adds an error comment to the Notion page and leaves `Processed = false` so it will retry

### Step 7 — Agent 1 Extracts the Invoice (Document Extraction Agent)

[src/agents/extraction/agent.ts](src/agents/extraction/agent.ts) uses the Anthropic Claude SDK to read and understand the invoice PDF.

It tries to extract data using a chain of fallbacks, stopping at the first that succeeds:

| Attempt | Method | How |
|---|---|---|
| 1 | Pulse Studio structured schema | Sends the PDF to Pulse Studio API with a predefined invoice schema |
| 2 | Pulse Studio markdown | Asks Pulse to convert the PDF to markdown, then parses the text |
| 3 | Agent-driven extraction | Claude reads the raw PDF text (via `pdf-parse`) and extracts fields itself |
| 4 | Handoff | If all fail, passes control to Agent 2 with a note that extraction failed |

The extracted data (amount, references, beneficiary details, POP email addresses) is saved to a local SQLite database (hosted on Turso) in the `documents` table. Every decision Claude makes is logged to the `agent_logs` table for auditing.

### Step 8 — Agent 2 Creates the Payment Record (Payment Decision Agent)

[src/agents/payment-decision/agent.ts](src/agents/payment-decision/agent.ts) reads the extracted documents from SQLite and makes the payment record in Notion.

It:

1. Reads the extracted invoice data from the `documents` table
2. Fetches all bank accounts from Notion and picks the right one based on context
3. Tries to match the beneficiary against existing records in Notion:
   - For normal bank transfers: searches by bank account number
   - For SARS / municipal payments: searches by institution name + reference number (e.g. PRN)
4. If no match is found, creates a new beneficiary record in Notion
5. Creates a **Payment** record in Notion with status `pending` and links to the email, beneficiary, and bank account
6. Marks the document as processed in SQLite

### Step 9 — Notification Emails

When a payment's status changes in Notion, a webhook fires again. [src/services/notification-service.ts](src/services/notification-service.ts) sends an email to the right person:

| Status change | Who gets emailed | Why |
|---|---|---|
| `pending` created | Lara | A new payment needs her attention |
| `approved` | Lara | Ricky approved it — she needs to load it into the bank |
| `loaded` | Ricky | Lara loaded it — he needs to authorise in the bank |
| `rejected` | Ricky | Something went wrong — he needs to review |

Email templates live in [src/templates/email-templates.ts](src/templates/email-templates.ts). Emails are sent via Gmail SMTP using `nodemailer`.

---

## The Notion Databases

Notion is the single source of truth. There are four databases:

### Payment Emails
Holds the raw incoming emails. Each row represents one email from Ricky.

Key fields: `Processed` (checkbox), `GCS Attachment Path` (where the PDFs are stored), `Email Body`, `Received Date`.

### Payments
The main tracking database. Each row is one payment moving through the workflow.

**Status flow:**
```
pending → approved → loaded → authorised
                           ↘ rejected
```

- `pending` — created by Agent 2, awaiting Ricky's review
- `approved` — Ricky approved it in Notion
- `loaded` — Lara loaded it into the ABSA banking system
- `authorised` — Ricky authorised it in ABSA, payment is complete
- `rejected` — something was loaded incorrectly

### Bank Account Beneficiaries
Everyone who can receive a payment. Supports two types:

- **Standard** — normal bank transfers (has account number, branch code)
- **Preloaded** — ABSA system beneficiaries like SARS tax payments or municipal bills (uses an institution reference number like a PRN instead of a bank account)

### Bank Accounts
Ricky's own ABSA accounts that payments are sent *from*.

---

## The Two-Agent Architecture

The system uses two separate Claude agents rather than one. This separation of concerns makes each agent simpler and easier to reason about.

```
Agent 1: Document Extraction
  Input:  PDF file paths in GCS
  Output: Structured invoice data in SQLite
  Focus:  Reading and understanding documents

Agent 2: Payment Decision
  Input:  Structured data from SQLite
  Output: Payment record in Notion
  Focus:  Business logic (matching beneficiaries, selecting accounts, creating records)
```

If Agent 1 fails (e.g. the PDF is unreadable), Agent 2 still runs — it may be able to extract enough from the email body alone. If Agent 2 fails, the email is left unprocessed and will be retried on the next webhook or manual trigger.

---

## Security Model

| Layer | Mechanism |
|---|---|
| Gmail → GCS | Google service account with restricted permissions |
| GCS file access | Private bucket; signed URLs with 30-minute expiry |
| Notion webhook authenticity | HMAC-SHA256 signature verification in the Cloud Function proxy |
| Cloud Run access | Requires a Google Cloud identity token; not publicly accessible |
| Secrets | All credentials stored in Google Secret Manager; never in code |

---

## Directory Structure

```
payment-manager/
│
├── src/                          # Main application (TypeScript)
│   ├── server.ts                 # Express HTTP server — entry point
│   ├── index.ts                  # Public exports
│   │
│   ├── api/
│   │   └── webhooks/
│   │       └── notion.ts         # Webhook routing and handling
│   │
│   ├── agents/
│   │   ├── extraction/           # Agent 1 — reads PDFs, extracts invoice data
│   │   │   ├── agent.ts
│   │   │   ├── tools.ts          # Tools Claude can call
│   │   │   └── types.ts
│   │   └── payment-decision/     # Agent 2 — creates payment records
│   │       ├── agent.ts
│   │       ├── tools.ts
│   │       ├── types.ts
│   │       └── institution-mapping.ts  # SARS, municipal codes
│   │
│   ├── services/
│   │   ├── email-processor.ts    # Orchestrates Agent 1 + Agent 2
│   │   └── notification-service.ts  # Sends status-change emails
│   │
│   ├── lib/
│   │   ├── notion-client.ts      # All Notion API calls (queries, creates, updates)
│   │   ├── gcs-uploader.ts       # Google Cloud Storage uploads and signed URLs
│   │   ├── email-client.ts       # Gmail SMTP via nodemailer
│   │   ├── pulse-client.ts       # Pulse Studio PDF extraction API
│   │   ├── db.ts                 # Drizzle ORM + Turso SQLite client
│   │   ├── auth.ts               # HMAC signature verification
│   │   ├── cache.ts              # In-memory caches (replay, processing, notifications)
│   │   ├── rate-limiter.ts       # Webhook rate limiting
│   │   ├── prompts.ts            # Loads and versions AI system prompts
│   │   └── schema-converter.ts   # Converts Pulse schemas to Zod validators
│   │
│   ├── config/
│   │   └── environment.ts        # Validates all env vars at startup (Zod)
│   │
│   ├── prompts/
│   │   ├── extraction/
│   │   │   └── system-v1.md      # Agent 1 system prompt
│   │   └── payment-decision/
│   │       └── system-v1.md      # Agent 2 system prompt
│   │
│   ├── templates/
│   │   └── email-templates.ts    # HTML email templates for notifications
│   │
│   ├── types/
│   │   ├── payment.ts            # Core types (beneficiary, payment, bank account)
│   │   └── pulse.ts              # Pulse API response types
│   │
│   └── scripts/
│       ├── schema.ts             # Drizzle database schema definition
│       ├── logs.ts               # CLI viewer for agent run logs
│       └── metrics.ts            # CLI viewer for aggregated metrics
│
├── gas/                          # Google Apps Script (Gmail monitor)
│   ├── Code.js                   # Main script — monitors Gmail, uploads to GCS, creates Notion entries
│   └── appsscript.json           # Manifest
│
├── functions/
│   └── notion-webhook-proxy/     # Cloud Function — HMAC verification + forwarding
│       └── src/index.ts
│
├── drizzle/                      # SQL migration files (generated by drizzle-kit)
│
├── scripts/
│   └── trigger-cloud-run.sh      # Manually trigger the pipeline without a webhook
│
├── .github/workflows/
│   ├── deploy-cloud-run.yml      # CI/CD for Cloud Run (triggers on push to main)
│   ├── deploy-gas.yml            # CI/CD for Google Apps Script
│   └── deploy-cloud-function.yml # CI/CD for the webhook proxy
│
├── Dockerfile                    # Builds the Cloud Run container image
├── package.json                  # Dependencies and npm scripts
├── tsconfig.json                 # TypeScript configuration
└── drizzle.config.ts             # Drizzle ORM configuration
```

---

## SQLite Tables (Turso)

The SQLite database (`agent_runs`, `agent_logs`, `document_schemas`, `documents`) is used for:

| Table | Purpose |
|---|---|
| `document_schemas` | Extraction templates for different invoice types |
| `documents` | Extracted invoice data waiting for Agent 2 to process |
| `agent_runs` | One row per pipeline execution — timing, token usage, status |
| `agent_logs` | Detailed decision log — every tool call and result |

View this data with:
```bash
npm run logs      # recent agent runs
npm run metrics   # success rates, token usage by prompt version
```

---

## Deployment

Everything deploys automatically via GitHub Actions when code is pushed to the `main` branch:

| What | Trigger | Where |
|---|---|---|
| Cloud Run service | Changes to `src/` | Google Cloud Run (`africa-south1`) |
| Google Apps Script | Changes to `gas/` | Google Apps Script (Lara's account) |
| Webhook proxy | Changes to `functions/` | Google Cloud Functions (`africa-south1`) |

The Cloud Run build process: TypeScript is compiled → Docker image is built → pushed to Artifact Registry → deployed to Cloud Run.

---

## Manual Trigger

To process emails without waiting for a webhook (e.g. during development or after a failure):

```bash
# Trigger the Cloud Run pipeline directly
./scripts/trigger-cloud-run.sh

# Trigger a locally running dev server
./scripts/trigger-cloud-run.sh --local
```

This calls `processAllUnprocessedEmails()`, which only touches emails where `Processed = false` — safe to run multiple times.
