//components/StatusBadge.js
import type { PaymentStatus } from '@/lib/mock-data'

const statusConfig: Record<PaymentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', classes: 'bg-blue-100 text-blue-800' },
  loaded: { label: 'Loaded', classes: 'bg-purple-100 text-purple-800' },
  authorised: { label: 'Authorised', classes: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, classes } = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
