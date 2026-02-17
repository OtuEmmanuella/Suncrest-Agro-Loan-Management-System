// lib/utils/supabase-helpers.ts

/**
 * Helper to extract data from Supabase joins which can return either object or array
 */
export function extractSingle<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

/**
 * Get client name from various Supabase response formats
 */
export function getClientName(clients: any): string {
  if (!clients) return 'Unknown';
  if (Array.isArray(clients)) return clients[0]?.full_name || 'Unknown';
  return clients.full_name || 'Unknown';
}

/**
 * Get client ID from various Supabase response formats
 */
export function getClientId(clients: any): string {
  if (!clients) return '';
  if (Array.isArray(clients)) return clients[0]?.id || '';
  return clients.id || '';
}