// lib/utils/business-days.ts

/**
 * Business day utilities for 5-day work week (Mon-Fri only)
 * Saturdays and Sundays are GRACE DAYS - no payments expected
 * 
 * NOTE: Loan amounts are still calculated with 7 days
 * Grace days only affect WHEN payments are due, not HOW MUCH is owed
 */

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date)
}

/**
 * Add business days to a date (skips weekends)
 * @param date Starting date
 * @param days Number of business days to add
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days
  
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    if (!isWeekend(result)) {
      remaining--
    }
  }
  
  return result
}

/**
 * Get the next business day from a date
 * If the date is already a business day, returns it unchanged
 * If it's a weekend, moves to next Monday
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date)
  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

/**
 * Calculate business days between two dates (excludes weekends)
 */
export function businessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  
  // If end is before start, return 0
  if (end < start) return 0
  
  let count = 0
  const current = new Date(start)
  
  while (current <= end) {
    if (!isWeekend(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

/**
 * Calculate next payment date based on payment plan
 * This handles grace days (weekends) for payment scheduling
 * 
 * IMPORTANT: The loan amount is still calculated with 7 days
 * Grace days only mean "don't expect payment on Sat/Sun"
 */
export function calculateNextPaymentDate(
  lastPaymentDate: string | Date,
  paymentPlan: 'daily' | 'weekly' | 'monthly'
): string {
  const date = typeof lastPaymentDate === 'string' 
    ? new Date(lastPaymentDate) 
    : new Date(lastPaymentDate)
  
  let nextDate: Date
  
  switch (paymentPlan) {
    case 'daily':
      // Add 1 BUSINESS day (skip Sat/Sun)
      // If today is Friday, next payment is Monday
      nextDate = addBusinessDays(date, 1)
      break
      
    case 'weekly':
      // Add 7 CALENDAR days, then move to next business day if weekend
      nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 7)
      nextDate = getNextBusinessDay(nextDate)
      break
      
    case 'monthly':
      // Add 30 CALENDAR days, then move to next business day if weekend
      nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 30)
      nextDate = getNextBusinessDay(nextDate)
      break
      
    default:
      nextDate = new Date(date)
  }
  
  return nextDate.toISOString().split('T')[0]
}

/**
 * Check if a date is overdue (past today and not weekend)
 */
export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  return due < today
}

/**
 * Calculate business days until a date
 */
export function businessDaysUntil(targetDate: string | Date): number {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  
  return businessDaysBetween(today, target)
}