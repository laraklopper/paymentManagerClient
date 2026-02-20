// lib/api-client.ts
// Public API surface for the application.
// All functions here are async and simulate real network latency via `delay()`.
// When a real backend is added, each function body can be swapped out for an
// actual fetch/axios call without changing any call-sites in the UI.

import {
  getMockPayments,
  getMockPayment,
  getMockBeneficiaries,
  getMockBankAccounts,
  getMockEmails,
  updateMockPayment,
  addMockBeneficiary,
  type Payment,
  type Beneficiary,
  type BankAccount,
  type PaymentEmail,
  type PaymentStatus,
} from './mock-data'

// Simulates network round-trip latency so UI loading states are exercised during development.
// Defaults to 300 ms — adjust as needed.
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

// ── Payments ──────────────────────────────────────────────────────────────────

// Returns all payments, optionally filtered to a single status.
// e.g. getPayments({ status: 'pending' }) returns only pending payments.
export async function getPayments(filters?: { status?: PaymentStatus }): Promise<Payment[]> {
  await delay()
  const all = getMockPayments()
  if (filters?.status) return all.filter((p) => p.status === filters.status)
  return all
}

// Returns a single payment by ID, or null if it does not exist.
export async function getPayment(id: string): Promise<Payment | null> {
  await delay()
  return getMockPayment(id) ?? null
}

// Moves a payment to 'approved' and records the approval timestamp.
// Called by an admin after reviewing a pending payment.
export async function approvePayment(id: string): Promise<void> {
  await delay()
  updateMockPayment(id, { status: 'approved', dateApproved: new Date().toISOString() })
}

// Moves a payment to 'rejected'.
// The caller is responsible for adding a rejection note separately if needed.
export async function rejectPayment(id: string): Promise<void> {
  await delay()
  updateMockPayment(id, { status: 'rejected' })
}

// Moves a payment to 'loaded', indicating it has been entered into ABSA
// and is awaiting final authorisation by a bank signatory.
export async function markPaymentLoaded(id: string): Promise<void> {
  await delay()
  updateMockPayment(id, { status: 'loaded' })
}

// Moves a payment to 'authorised', the terminal success state.
// At this point the bank has released the funds.
export async function authorisePayment(id: string): Promise<void> {
  await delay()
  updateMockPayment(id, { status: 'authorised' })
}

// ── Beneficiaries ─────────────────────────────────────────────────────────────

// Returns the full list of known beneficiaries.
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  await delay()
  return getMockBeneficiaries()
}

// Creates and persists a new beneficiary, then returns the created record.
// The `id` field is generated automatically by the mock data layer.
export async function createBeneficiary(data: Omit<Beneficiary, 'id'>): Promise<Beneficiary> {
  await delay()
  return addMockBeneficiary(data)
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

// Returns the organisation's own bank accounts (payment sources).
export async function getBankAccounts(): Promise<BankAccount[]> {
  await delay()
  return getMockBankAccounts()
}

// ── Emails ────────────────────────────────────────────────────────────────────

// Returns all inbound payment-request emails, both processed and unprocessed.
export async function getEmails(): Promise<PaymentEmail[]> {
  await delay()
  return getMockEmails()
}
