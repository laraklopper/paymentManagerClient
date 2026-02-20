import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getBankAccounts } from '@/lib/api-client'
import styles from './bankAccounts.module.css'

export default async function BankAccountsPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  if (role !== 'admin') {
    redirect('/dashboard/payments')
  }

  const accounts = await getBankAccounts()

  //=============JSX=====================

  return (
    <div className={styles.bankAccountContainer}>
      <h1 className={styles.heading}>Bank Accounts</h1>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Account Number</th>
              <th className={styles.th}>Branch Code</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className={styles.tdName}>{account.name}</td>
                <td className={styles.tdMono}>{account.accountNumber}</td>
                <td className={styles.tdMono}>{account.branchCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
