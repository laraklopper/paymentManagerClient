'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Payment, PaymentStatus } from '@/lib/mock-data'
import StatusBadge from '@/components/StatusBadge'

const STATUSES: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'loaded', label: 'Loaded' },
  { value: 'authorised', label: 'Authorised' },
  { value: 'rejected', label: 'Rejected' },
]

function formatZAR(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')

  const filtered =
    statusFilter === 'all' ? payments : payments.filter((p) => p.status === statusFilter)

  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Payment ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Beneficiary</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No payments found
                </td>
              </tr>
            ) : (
              filtered.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/payments/${payment.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {payment.paymentId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{payment.toBeneficiary.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {formatZAR(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(payment.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
