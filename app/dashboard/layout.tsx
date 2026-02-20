import { headers } from 'next/headers'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const role = (headersList.get('x-user-role') ?? 'loader') as 'admin' | 'loader'
  const email = headersList.get('x-user-email') ?? ''

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={role} email={email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
