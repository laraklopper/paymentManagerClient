import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayment } from '@/lib/api-client'
import StatusBadge from '@/components/StatusBadge'
import PaymentActions from './PaymentActions'

function formatZAR(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [payment, headersList] = await Promise.all([getPayment(id), headers()])

  if (!payment) notFound()

  const role = (headersList.get('x-user-role') ?? 'loader') as 'admin' | 'loader'

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Payment ID', value: payment.paymentId },
    { label: 'Status', value: <StatusBadge status={payment.status} /> },
    {
      label: 'Amount',
      value: <span className="font-mono font-semibold">{formatZAR(payment.amount)}</span>,
    },
    { label: 'From Bank Account', value: payment.fromBankAccount.name },
    { label: 'To Beneficiary', value: payment.toBeneficiary.name },
    { label: 'Beneficiary Reference', value: payment.beneficiaryReference ?? '—' },
    { label: 'Payer Reference', value: payment.payerReference ?? '—' },
    { label: 'Beneficiary POP Email', value: payment.beneficiaryPOPEmail ?? '—' },
    { label: 'Payer POP Email', value: payment.payerPOPEmail ?? '—' },
    { label: 'New Beneficiary', value: payment.isNewBeneficiary ? 'Yes' : 'No' },
    { label: 'Date Approved', value: formatDate(payment.dateApproved) },
    { label: 'Created', value: formatDate(payment.createdAt) },
    { label: 'Last Updated', value: formatDate(payment.updatedAt) },
  ]

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/payments" className="text-sm text-gray-500 hover:text-gray-900">
          ← Payments
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{payment.paymentId}</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {fields.map(({ label, value }) => (
              <tr key={label}>
                <td className="px-4 py-3 font-medium text-gray-600 w-48 bg-gray-50 whitespace-nowrap">
                  {label}
                </td>
                <td className="px-4 py-3 text-gray-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payment.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Notes</p>
          <p className="text-sm text-amber-700">{payment.notes}</p>
        </div>
      )}

      <PaymentActions payment={payment} userRole={role} />
    </div>
  )
}
