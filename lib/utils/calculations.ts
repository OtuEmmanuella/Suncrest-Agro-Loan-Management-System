// lib/utils/calculations.ts
import { PaymentPlan } from '@/types';

export type DurationUnit = 'days' | 'weeks' | 'months';

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

/**
 * NEW: Convert duration to days
 */
export function convertToDays(value: number, unit: DurationUnit): number {
  switch (unit) {
    case 'days':
      return value;
    case 'weeks':
      return value * 7;
    case 'months':
      return value * 30; // Approximate
    default:
      return value * 30;
  }
}

/**
 * NEW: Calculate number of payments based on duration and payment plan
 */
export function calculatePaymentCount(
  durationValue: number,
  durationUnit: DurationUnit,
  paymentPlan: PaymentPlan
): number {
  const totalDays = convertToDays(durationValue, durationUnit);
  
  switch (paymentPlan) {
    case 'daily':
      return totalDays;
    case 'weekly':
      return Math.ceil(totalDays / 7);
    case 'monthly':
      return Math.ceil(totalDays / 30);
    default:
      return Math.ceil(totalDays / 30);
  }
}

/**
 * NEW: Get duration display text
 */
export function getDurationDisplay(value: number, unit: DurationUnit): string {
  return `${value} ${unit}`;
}

/**
 * NEW: Calculate duration in months for backward compatibility
 */
export function convertToMonths(value: number, unit: DurationUnit): number {
  const days = convertToDays(value, unit);
  return Math.ceil(days / 30);
}