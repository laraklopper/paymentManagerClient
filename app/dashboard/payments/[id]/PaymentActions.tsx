'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Payment } from '@/lib/mock-data'
import {
  approvePaymentAction,
  rejectPaymentAction,
  markPaymentLoadedAction,
  authorisePaymentAction,
} from './actions'

type Variant = 'primary' | 'danger' | 'success' | 'purple'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
}

export default function PaymentActions({
  payment,
  userRole,
}: {
  payment: Payment
  userRole: 'admin' | 'loader'
}) {
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  function act(fn: () => Promise<void>, label: string) {
    startTransition(async () => {
      await fn()
      setSuccessMsg(`${label} successful`)
      router.refresh()
      setTimeout(() => setSuccessMsg(''), 3000)
    })
  }

  const { status } = payment
  const isAdmin = userRole === 'admin'
  const isLoader = userRole === 'loader'

  const buttons: { label: string; show: boolean; onClick: () => void; variant: Variant }[] = [
    {
      label: 'Approve',
      show: isAdmin && status === 'pending',
      onClick: () => act(() => approvePaymentAction(payment.id), 'Approval'),
      variant: 'primary',
    },
    {
      label: 'Reject',
      show: isAdmin && (status === 'pending' || status === 'loaded'),
      onClick: () => act(() => rejectPaymentAction(payment.id), 'Rejection'),
      variant: 'danger',
    },
    {
      label: 'Mark as Loaded',
      show: isLoader && status === 'approved',
      onClick: () => act(() => markPaymentLoadedAction(payment.id), 'Loaded'),
      variant: 'purple',
    },
    {
      label: 'Authorise',
      show: isAdmin && status === 'loaded',
      onClick: () => act(() => authorisePaymentAction(payment.id), 'Authorisation'),
      variant: 'success',
    },
  ]

  const visibleButtons = buttons.filter((b) => b.show)
  if (visibleButtons.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Actions</p>
      <div className="flex gap-3 flex-wrap">
        {visibleButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={isPending}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${variantClasses[btn.variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending ? 'Processing…' : btn.label}
          </button>
        ))}
      </div>
      {successMsg && <p className="mt-3 text-sm text-green-600 font-medium">{successMsg}</p>}
    </div>
  )
}
