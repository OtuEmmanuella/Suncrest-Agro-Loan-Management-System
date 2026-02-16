// lib/utils/formatting.ts
import { format, parseISO } from 'date-fns';

/**
 * Format currency to Nigerian Naira
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM dd, yyyy h:mm a');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format phone number - handles null/undefined
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return 'N/A';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as XXX-XXXX-XXXX
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return original if not 11 digits
  return phone;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}