// app/(dashboard)/page.tsx
'use client';

import React from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { PaymentAlerts } from '@/components/dashboard/PaymentAlerts';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';
import { getClientName } from '@/lib/utils/supabase-helpers';

interface DashboardStats {
  total_disbursed: number;
  total_repaid: number;
  pending_amount: number;
  total_clients: number;
}

interface Loan {
  id: string;
  loan_amount: number;
  payment_plan: string;
  status: string;
  created_at: string;
  clients?: any;
}

export default function DashboardPage() {
  // Fetch stats with automatic caching
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: async (): Promise<DashboardStats> => {
      const { data: allLoans } = await supabase
        .from('loans')
        .select('loan_amount, total_due, total_paid, status')
        .limit(1000);

      const disbursed = allLoans
        ?.filter(l => l.status === 'disbursed' || l.status === 'completed')
        .reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

      const repaid = allLoans?.reduce((sum, l) => sum + Number(l.total_paid || 0), 0) || 0;

      const pending = allLoans
        ?.filter(l => l.status === 'disbursed')
        .reduce((sum, l) => sum + (Number(l.total_due) - Number(l.total_paid || 0)), 0) || 0;

      const { count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true });

      return {
        total_disbursed: disbursed,
        total_repaid: repaid,
        pending_amount: pending,
        total_clients: clientCount || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
  });

  // Fetch recent loans
  const { data: recentLoans = [], isLoading: loansLoading } = useQuery({
    queryKey: QUERY_KEYS.recentLoans,
    queryFn: async (): Promise<Loan[]> => {
      const { data } = await supabase
        .from('loans')
        .select('id, loan_amount, payment_plan, status, created_at, clients(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // Fresh for 1 minute
  });

  if (statsLoading || loansLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Dashboard" />

      <PaymentAlerts />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Disbursed"
          value={stats?.total_disbursed || 0}
          icon="💰"
          isCurrency
        />
        <StatsCard
          title="Total Repaid"
          value={stats?.total_repaid || 0}
          icon="✅"
          isCurrency
        />
        <StatsCard
          title="Pending Amount"
          value={stats?.pending_amount || 0}
          icon="⏳"
          isCurrency
        />
        <StatsCard
          title="Total Clients"
          value={stats?.total_clients || 0}
          icon="👥"
        />
      </div>

      <div className="flex gap-3 mb-6">
        <Link href="/clients/new">
          <Button size="sm">+ New Client</Button>
        </Link>
        <Link href="/loans/new">
          <Button size="sm">+ New Loan</Button>
        </Link>
        <Link href="/reports">
          <Button size="sm" variant="secondary">📊 View Reports</Button>
        </Link>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-primary mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Client</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Plan</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Status</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentLoans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-secondary text-sm">
                    No loans found
                  </td>
                </tr>
              ) : (
                recentLoans.map((loan) => (
                  <tr key={loan.id} className="border-b border-sage hover:bg-cream transition-colors">
                    <td className="py-2 px-3 text-sm">{getClientName(loan.clients)}</td>
                    <td className="py-2 px-3 text-sm font-semibold">{formatCurrency(loan.loan_amount)}</td>
                    <td className="py-2 px-3 text-sm capitalize">{loan.payment_plan}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          loan.status === 'disbursed'
                            ? 'bg-green-100 text-green-700'
                            : loan.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{formatDate(loan.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}