import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getEmails } from '@/lib/api-client'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="text-green-600 font-bold">✓</span>
  ) : (
    <span className="text-amber-500 font-bold">✗</span>
  )
}

export default async function EmailsPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  if (role !== 'admin') {
    redirect('/dashboard/payments')
  }

  const emails = await getEmails()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Email Records</h1>
        <span className="text-sm text-gray-500">{emails.length} total</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Sender</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Processed</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Attachments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                  {email.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{email.senderEmail}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(email.receivedDate)}</td>
                <td className="px-4 py-3 text-center">
                  <CheckIcon checked={email.processed} />
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {email.gcsAttachmentPaths.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
