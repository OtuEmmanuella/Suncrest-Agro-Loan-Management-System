// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // Data fresh for 2 minutes
      gcTime: 10 * 60 * 1000, // Garbage collection time (renamed from cacheTime)
      refetchOnWindowFocus: true, // Refetch when user comes back to tab
      refetchOnReconnect: true, // Refetch when internet reconnects
      retry: 1, // Retry failed requests once
    },
  },
});

// Cache keys - centralized for consistency
export const QUERY_KEYS = {
  // Dashboard
  dashboardStats: ['dashboard', 'stats'] as const,
  recentLoans: ['dashboard', 'recent-loans'] as const,
  
  // Clients
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,
  
  // Loans
  loans: ['loans'] as const,
  loan: (id: string) => ['loans', id] as const,
  loansByPlan: (plan: string) => ['loans', 'plan', plan] as const,
  pendingLoans: ['loans', 'pending'] as const,
  
  // Payments
  payments: (loanId: string) => ['payments', loanId] as const,
  paymentAlerts: ['payment-alerts'] as const,
  
  // Reports
  reportsStats: ['reports', 'stats'] as const,
  
  // Audit
  auditLogs: ['audit-logs'] as const,
  
  // User
  userProfile: ['user', 'profile'] as const,
};