'use client'

import { useState, useTransition } from 'react'
import type { Beneficiary, BeneficiaryType } from '@/lib/mock-data'
import { createBeneficiaryAction } from './actions'

function CheckIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="text-green-600 font-bold">✓</span>
  ) : (
    <span className="text-gray-300">✗</span>
  )
}

const emptyForm = {
  name: '',
  type: 'standard' as BeneficiaryType,
  loadedOnAbsa: false,
  bankName: '',
  bankAccountNumber: '',
  branchCode: '',
  institutionReference: '',
  defaultBeneficiaryReference: '',
  defaultPayerReference: '',
  defaultBeneficiaryPOPEmail: '',
  defaultPayerPOPEmail: '',
}

export default function BeneficiariesClient({
  initialBeneficiaries,
}: {
  initialBeneficiaries: Beneficiary[]
}) {
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const data: Omit<Beneficiary, 'id'> = {
      name: form.name,
      type: form.type,
      loadedOnAbsa: form.loadedOnAbsa,
      ...(form.type === 'standard'
        ? {
            bankName: form.bankName || undefined,
            bankAccountNumber: form.bankAccountNumber || undefined,
            branchCode: form.branchCode || undefined,
          }
        : {
            institutionReference: form.institutionReference || undefined,
          }),
      defaultBeneficiaryReference: form.defaultBeneficiaryReference || undefined,
      defaultPayerReference: form.defaultPayerReference || undefined,
      defaultBeneficiaryPOPEmail: form.defaultBeneficiaryPOPEmail || undefined,
      defaultPayerPOPEmail: form.defaultPayerPOPEmail || undefined,
    }

    startTransition(async () => {
      try {
        const newBen = await createBeneficiaryAction(data)
        setBeneficiaries((prev) => [...prev, newBen])
        setShowModal(false)
        setForm(emptyForm)
      } catch {
        setError('Failed to create beneficiary. Please try again.')
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Beneficiaries</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Beneficiary
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Bank / Institution Details</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Loaded on ABSA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {beneficiaries.map((ben) => (
              <tr key={ben.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{ben.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      ben.type === 'standard'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {ben.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                  {ben.type === 'standard'
                    ? ben.bankAccountNumber
                      ? `${ben.bankName} · ${ben.bankAccountNumber}`
                      : '—'
                    : ben.institutionReference ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <CheckIcon checked={ben.loadedOnAbsa} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Add Beneficiary</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); setError('') }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard (bank account)</option>
                  <option value="preloaded">Preloaded (ABSA institution)</option>
                </select>
              </div>

              {form.type === 'standard' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        name="bankName"
                        value={form.bankName}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Branch Code</label>
                      <input
                        name="branchCode"
                        value={form.branchCode}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      name="bankAccountNumber"
                      value={form.bankAccountNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Institution Reference (e.g. PRN, municipal account number)
                  </label>
                  <input
                    name="institutionReference"
                    value={form.institutionReference}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Default Beneficiary Ref
                  </label>
                  <input
                    name="defaultBeneficiaryReference"
                    value={form.defaultBeneficiaryReference}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Default Payer Ref
                  </label>
                  <input
                    name="defaultPayerReference"
                    value={form.defaultPayerReference}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="loadedOnAbsa"
                    checked={form.loadedOnAbsa}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Already loaded on ABSA
                </label>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? 'Saving…' : 'Add Beneficiary'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm); setError('') }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
