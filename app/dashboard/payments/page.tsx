import { getPayments } from '@/lib/api-client'
import PaymentsTable from './PaymentsTable'

export default async function PaymentsPage() {
  const payments = await getPayments()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <span className="text-sm text-gray-500">{payments.length} total</span>
      </div>
      <PaymentsTable payments={payments} />
    </div>
  )
}
