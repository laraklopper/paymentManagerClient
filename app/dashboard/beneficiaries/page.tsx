import { getBeneficiaries } from '@/lib/api-client'
import BeneficiariesClient from './BeneficiariesClient'

export default async function BeneficiariesPage() {
  const beneficiaries = await getBeneficiaries()

  return (
    <div className="p-6">
      <BeneficiariesClient initialBeneficiaries={beneficiaries} />
    </div>
  )
}
