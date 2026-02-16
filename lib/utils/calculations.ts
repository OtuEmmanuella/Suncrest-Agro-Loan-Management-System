// lib/utils/calculations.ts
import { PaymentPlan } from '@/types';

/**
 * Calculate total repayable amount (principal + interest)
 */
export function calculateTotalAmount(
  principal: number,
  interestRate: number
): number {
  const interest = (principal * interestRate) / 100;
  return principal + interest;
}

/**
 * Calculate per-installment amount
 */
export function calculateInstallmentAmount(
  totalAmount: number,
  paymentCount: number
): number {
  return totalAmount / paymentCount;
}

/**
 * Calculate interest amount
 */
export function calculateInterest(
  principal: number,
  interestRate: number
): number {
  return (principal * interestRate) / 100;
}

/**
 * Calculate loan balance remaining
 */
export function calculateBalance(
  totalAmount: number,
  totalPaid: number
): number {
  return Math.max(0, totalAmount - totalPaid);
}

/**
 * Get payment frequency label
 */
export function getPaymentFrequencyLabel(plan: PaymentPlan): string {
  const labels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };
  return labels[plan];
}

/**
 * Calculate loan completion percentage
 */
export function calculateCompletionPercentage(
  totalAmount: number,
  totalPaid: number
): number {
  if (totalAmount === 0) return 0;
  return Math.min(100, (totalPaid / totalAmount) * 100);
}
