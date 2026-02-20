'use server'

import { revalidatePath } from 'next/cache'
import {
  approvePayment,
  rejectPayment,
  markPaymentLoaded,
  authorisePayment,
} from '@/lib/api-client'

export async function approvePaymentAction(id: string) {
  await approvePayment(id)
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath('/dashboard/payments')
}

export async function rejectPaymentAction(id: string) {
  await rejectPayment(id)
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath('/dashboard/payments')
}

export async function markPaymentLoadedAction(id: string) {
  await markPaymentLoaded(id)
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath('/dashboard/payments')
}

export async function authorisePaymentAction(id: string) {
  await authorisePayment(id)
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath('/dashboard/payments')
}
