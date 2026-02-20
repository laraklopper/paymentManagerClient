'use server'

import { revalidatePath } from 'next/cache'
import { createBeneficiary } from '@/lib/api-client'
import type { Beneficiary } from '@/lib/mock-data'

export async function createBeneficiaryAction(
  data: Omit<Beneficiary, 'id'>
): Promise<Beneficiary> {
  const beneficiary = await createBeneficiary(data)
  revalidatePath('/dashboard/beneficiaries')
  return beneficiary
}
