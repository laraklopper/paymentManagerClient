// lib/mock-data.ts
// This file acts as an in-memory database for development and testing.
// It defines all shared types and provides the seed data that the API client reads from and writes to.

// ── Shared Types ──────────────────────────────────────────────────────────────

// The lifecycle states a payment moves through:
//   pending → approved → loaded → authorised
// or it can be rejected at any point before authorised.
export type PaymentStatus = 'pending' | 'approved' | 'loaded' | 'authorised' | 'rejected'

// Determines how a beneficiary is handled on the banking side:
//   'preloaded' — a utility/institution already registered on ABSA (e.g. SARS, municipality)
//   'standard'  — a regular bank-to-bank transfer to a private party
export type BeneficiaryType = 'standard' | 'preloaded'

// ── Interface Definitions ─────────────────────────────────────────────────────

// Represents a single payment instruction from one bank account to a beneficiary.
export interface Payment {
  id: string                                        // Internal record ID (e.g. "pay-1")
  paymentId: string                                 // Human-readable reference (e.g. "PAY-001")
  status: PaymentStatus
  amount: number                                    // Amount in ZAR (South African Rand)
  fromBankAccount: { id: string; name: string }     // Source account snapshot
  toBeneficiary: { id: string; name: string }       // Destination beneficiary snapshot
  beneficiaryReference?: string                     // Reference shown on the beneficiary's statement
  payerReference?: string                           // Reference shown on the payer's statement
  beneficiaryPOPEmail?: string                      // Email to send proof-of-payment to beneficiary
  payerPOPEmail?: string                            // Email to send proof-of-payment to payer
  isNewBeneficiary: boolean                         // Flags payments that need a new beneficiary loaded first
  notes?: string                                    // Internal notes (e.g. rejection reasons)
  linkedEmailId?: string                            // ID of the source email that triggered this payment
  dateApproved?: string                             // ISO timestamp set when status moves to 'approved'
  createdAt: string                                 // ISO timestamp of record creation
  updatedAt: string                                 // ISO timestamp of last update
}

// Represents an inbound email that contains a payment request or invoice.
// Emails are processed and linked to a Payment record via linkedEmailId.
export interface PaymentEmail {
  id: string
  name: string                      // Short display name / subject summary
  senderEmail: string               // Who sent the email
  emailBody: string                 // Plain-text content of the email
  receivedDate: string              // ISO timestamp of receipt
  processed: boolean                // True once a Payment has been created from this email
  gcsAttachmentPaths: string[]      // Google Cloud Storage paths to any attached documents
}

// Represents a payment recipient. Either a utility/institution (preloaded) or a
// regular bank account holder (standard).
export interface Beneficiary {
  id: string
  name: string
  type: BeneficiaryType
  loadedOnAbsa: boolean              // Whether this beneficiary is already registered in ABSA
  beneficiaryNumber?: number         // ABSA-assigned number (only for preloaded beneficiaries)
  bankName?: string                  // Bank name (only for standard beneficiaries)
  bankAccountNumber?: string         // Account number (only for standard beneficiaries)
  branchCode?: string                // Branch/routing code (only for standard beneficiaries)
  institutionReference?: string      // Utility's own reference number (preloaded only)
  defaultBeneficiaryReference?: string  // Pre-filled reference for the beneficiary's statement
  defaultPayerReference?: string        // Pre-filled reference for the payer's statement
  defaultBeneficiaryPOPEmail?: string   // Default email for sending POP to beneficiary
  defaultPayerPOPEmail?: string         // Default email for sending POP to payer
}

// Represents one of the organisation's own bank accounts that payments are sent from.
export interface BankAccount {
  id: string
  name: string
  accountNumber: string
  branchCode: string
}

// ── In-memory store (mutable, persists within a server process) ───────────────
// These arrays act as the "database" while running locally.
// Data resets every time the dev server restarts.

// Fixed list of source bank accounts — unlikely to change during a session
const bankAccounts: BankAccount[] = [
  { id: 'ba-1', name: 'Klopper Family Trust — ABSA', accountNumber: '4076543210', branchCode: '632005' },
  { id: 'ba-2', name: 'Klopper Properties — ABSA', accountNumber: '4071234567', branchCode: '632005' },
]

// Mutable: new beneficiaries can be added via addMockBeneficiary()
let beneficiaries: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Cape Town Municipality',
    type: 'preloaded',
    loadedOnAbsa: true,
    beneficiaryNumber: 12,
    institutionReference: 'CPT-ACC-884421',
    defaultPayerReference: 'RATES',
  },
  {
    id: 'ben-2',
    name: 'SARS-VAT',
    type: 'preloaded',
    loadedOnAbsa: true,
    beneficiaryNumber: 8,
    institutionReference: 'PRN-20261234567',
    defaultBeneficiaryReference: 'VAT201',
  },
  {
    id: 'ben-3',
    name: 'BuildIt Suppliers (Pty) Ltd',
    type: 'standard',
    loadedOnAbsa: true,
    beneficiaryNumber: 45,
    bankName: 'FNB',
    bankAccountNumber: '62987654321',
    branchCode: '250655',
    defaultBeneficiaryReference: 'INV',
    defaultPayerReference: 'KLOPPER',
    defaultBeneficiaryPOPEmail: 'accounts@buildit.co.za',
  },
  {
    id: 'ben-4',
    name: 'Apex Legal Inc',
    type: 'standard',
    loadedOnAbsa: false,   // Not yet on ABSA — payments to this beneficiary will be blocked
    bankName: 'Nedbank',
    bankAccountNumber: '1234567890',
    branchCode: '198765',
    defaultPayerReference: 'RETAINER',
  },
  {
    id: 'ben-5',
    name: 'SA Water Board',
    type: 'preloaded',
    loadedOnAbsa: true,
    beneficiaryNumber: 3,
    institutionReference: 'SAWB-009912',
  },
]

// Mutable: payment statuses are updated via updateMockPayment()
// Seed data covers all five statuses to support UI development of every state.
let payments: Payment[] = [
  {
    id: 'pay-1',
    paymentId: 'PAY-001',
    status: 'pending',              // Awaiting admin approval
    amount: 12500.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-3', name: 'BuildIt Suppliers (Pty) Ltd' },
    beneficiaryReference: 'INV-2026-0089',
    payerReference: 'KLOPPER-FEB',
    beneficiaryPOPEmail: 'accounts@buildit.co.za',
    isNewBeneficiary: false,
    linkedEmailId: 'email-1',
    createdAt: '2026-02-10T08:30:00Z',
    updatedAt: '2026-02-10T08:30:00Z',
  },
  {
    id: 'pay-2',
    paymentId: 'PAY-002',
    status: 'approved',             // Approved — waiting to be loaded into ABSA
    amount: 48750.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-1', name: 'Cape Town Municipality' },
    beneficiaryReference: 'RATES-Q1-2026',
    payerReference: 'RATES',
    isNewBeneficiary: false,
    dateApproved: '2026-02-12T09:00:00Z',
    createdAt: '2026-02-11T14:00:00Z',
    updatedAt: '2026-02-12T09:00:00Z',
  },
  {
    id: 'pay-3',
    paymentId: 'PAY-003',
    status: 'loaded',               // Loaded into ABSA — awaiting final authorisation
    amount: 95000.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-2', name: 'SARS-VAT' },
    beneficiaryReference: 'VAT201',
    payerReference: 'PRN-20261234567',
    isNewBeneficiary: false,
    dateApproved: '2026-02-08T10:00:00Z',
    linkedEmailId: 'email-2',
    createdAt: '2026-02-07T11:00:00Z',
    updatedAt: '2026-02-13T16:00:00Z',
  },
  {
    id: 'pay-4',
    paymentId: 'PAY-004',
    status: 'authorised',           // Fully authorised — payment has been released by the bank
    amount: 7250.5,
    fromBankAccount: { id: 'ba-2', name: 'Klopper Properties — ABSA' },
    toBeneficiary: { id: 'ben-5', name: 'SA Water Board' },
    isNewBeneficiary: false,
    dateApproved: '2026-02-01T09:30:00Z',
    createdAt: '2026-01-31T14:00:00Z',
    updatedAt: '2026-02-04T12:00:00Z',
  },
  {
    id: 'pay-5',
    paymentId: 'PAY-005',
    status: 'rejected',             // Rejected — reason captured in notes
    amount: 15000.0,
    fromBankAccount: { id: 'ba-2', name: 'Klopper Properties — ABSA' },
    toBeneficiary: { id: 'ben-4', name: 'Apex Legal Inc' },
    beneficiaryReference: 'RETAINER-JAN',
    payerReference: 'KLOPPER',
    isNewBeneficiary: false,
    notes: 'Beneficiary not yet loaded on ABSA — rejected, needs to be loaded first.',
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-06T09:00:00Z',
  },
  {
    id: 'pay-6',
    paymentId: 'PAY-006',
    status: 'pending',
    amount: 33400.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-4', name: 'Apex Legal Inc' },
    beneficiaryReference: 'RETAINER-FEB',
    payerReference: 'KLOPPER',
    isNewBeneficiary: true,         // Blocked until Apex Legal is first loaded onto ABSA
    notes: 'New beneficiary — Apex Legal Inc must be loaded on ABSA before payment can proceed.',
    linkedEmailId: 'email-3',
    createdAt: '2026-02-14T08:00:00Z',
    updatedAt: '2026-02-14T08:00:00Z',
  },
  {
    id: 'pay-7',
    paymentId: 'PAY-007',
    status: 'approved',
    amount: 5500.0,
    fromBankAccount: { id: 'ba-2', name: 'Klopper Properties — ABSA' },
    toBeneficiary: { id: 'ben-3', name: 'BuildIt Suppliers (Pty) Ltd' },
    beneficiaryReference: 'INV-2026-0092',
    payerReference: 'PROPS-FEB',
    isNewBeneficiary: false,
    dateApproved: '2026-02-15T11:00:00Z',
    createdAt: '2026-02-14T15:00:00Z',
    updatedAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'pay-8',
    paymentId: 'PAY-008',
    status: 'authorised',
    amount: 22100.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-1', name: 'Cape Town Municipality' },
    beneficiaryReference: 'LEVIES-Q4-2025',
    isNewBeneficiary: false,
    dateApproved: '2025-12-15T09:00:00Z',
    createdAt: '2025-12-14T10:00:00Z',
    updatedAt: '2025-12-16T14:00:00Z',
  },
  {
    id: 'pay-9',
    paymentId: 'PAY-009',
    status: 'loaded',
    amount: 11200.0,
    fromBankAccount: { id: 'ba-1', name: 'Klopper Family Trust — ABSA' },
    toBeneficiary: { id: 'ben-5', name: 'SA Water Board' },
    isNewBeneficiary: false,
    dateApproved: '2026-02-16T08:00:00Z',
    createdAt: '2026-02-15T16:00:00Z',
    updatedAt: '2026-02-17T09:00:00Z',
  },
]

// Inbound emails that triggered or are linked to payment records.
// email-4 is unprocessed — no Payment has been created from it yet.
const emails: PaymentEmail[] = [
  {
    id: 'email-1',
    name: 'Invoice INV-2026-0089 from BuildIt Suppliers',
    senderEmail: 'ricky@klopper.co.za',
    emailBody:
      'Please find attached invoice INV-2026-0089 for R12,500.00 for materials supplied in January 2026.',
    receivedDate: '2026-02-10T07:45:00Z',
    processed: true,
    gcsAttachmentPaths: ['payments/2026-feb/INV-2026-0089.pdf'],
  },
  {
    id: 'email-2',
    name: 'SARS VAT Payment Due — Feb 2026',
    senderEmail: 'ricky@klopper.co.za',
    emailBody:
      'VAT201 payment required. PRN: PRN-20261234567. Amount: R95,000.00. Due: 28 Feb 2026.',
    receivedDate: '2026-02-07T10:30:00Z',
    processed: true,
    gcsAttachmentPaths: ['payments/2026-feb/SARS-VAT-201-FEB2026.pdf'],
  },
  {
    id: 'email-3',
    name: 'Apex Legal Inc — February Retainer',
    senderEmail: 'ricky@klopper.co.za',
    emailBody:
      'February retainer invoice from Apex Legal Inc. Amount: R33,400.00. Please load as new beneficiary.',
    receivedDate: '2026-02-14T07:15:00Z',
    processed: true,
    gcsAttachmentPaths: ['payments/2026-feb/Apex-Legal-Retainer-Feb2026.pdf'],
  },
  {
    id: 'email-4',
    name: 'Pending: Insurance Renewal Premium',
    senderEmail: 'ricky@klopper.co.za',
    emailBody:
      'Annual insurance renewal. See attached invoice. Urgent — due end of month.',
    receivedDate: '2026-02-17T09:00:00Z',
    processed: false,               // Not yet linked to a payment — requires manual review
    gcsAttachmentPaths: ['payments/2026-feb/Insurance-Renewal-2026.pdf'],
  },
]

// ── Getters ───────────────────────────────────────────────────────────────────
// All getters return shallow copies of the arrays so callers cannot accidentally
// mutate the in-memory store directly.

export function getMockBankAccounts(): BankAccount[] {
  return [...bankAccounts]
}

export function getMockBeneficiaries(): Beneficiary[] {
  return [...beneficiaries]
}

export function getMockPayments(): Payment[] {
  return [...payments]
}

// Returns a single payment by its internal ID, or undefined if not found.
export function getMockPayment(id: string): Payment | undefined {
  return payments.find((p) => p.id === id)
}

export function getMockEmails(): PaymentEmail[] {
  return [...emails]
}

// ── Mutators ──────────────────────────────────────────────────────────────────

// Merges partial updates into a payment record and stamps updatedAt with the current time.
// No-ops silently if the ID does not exist.
export function updateMockPayment(id: string, updates: Partial<Payment>): void {
  const idx = payments.findIndex((p) => p.id === id)
  if (idx !== -1) {
    payments[idx] = { ...payments[idx], ...updates, updatedAt: new Date().toISOString() }
  }
}

// Creates a new beneficiary, assigns it a timestamp-based ID, appends it to the
// in-memory list, and returns the complete new record.
export function addMockBeneficiary(data: Omit<Beneficiary, 'id'>): Beneficiary {
  const newBen: Beneficiary = { ...data, id: `ben-${Date.now()}` }
  beneficiaries = [...beneficiaries, newBen]
  return newBen
}