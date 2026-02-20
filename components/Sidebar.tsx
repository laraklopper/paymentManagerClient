//components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard/payments', label: 'Payments', roles: ['admin', 'loader'] as const },
  { href: '/dashboard/beneficiaries', label: 'Beneficiaries', roles: ['admin', 'loader'] as const },
  { href: '/dashboard/bank-accounts', label: 'Bank Accounts', roles: ['admin'] as const },
  { href: '/dashboard/emails', label: 'Email Records', roles: ['admin'] as const },
]

export default function Sidebar({ role, email }: { role: 'admin' | 'loader'; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const visibleItems = navItems.filter((item) =>
    (item.roles as readonly string[]).includes(role)
  )

  return (
    <aside className="w-56 flex flex-col border-r border-gray-200 bg-white shrink-0">
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-900">Klopper Admin</span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 truncate font-medium">{email}</p>
        <p className="text-xs text-gray-400 capitalize mb-2">{role}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-red-600 hover:text-red-800 font-medium"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
