// app/(dashboard)/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { PaymentAlerts } from '@/components/dashboard/PaymentAlerts' 

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
  clients?: {
    full_name: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all loans for stats
      const { data: allLoans } = await supabase
        .from('loans')
        .select('*');

      // Calculate stats
      const disbursed = allLoans
        ?.filter(l => l.status === 'disbursed' || l.status === 'completed')
        .reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

      const repaid = allLoans?.reduce((sum, l) => sum + Number(l.total_paid || 0), 0) || 0;

      const pending = allLoans
        ?.filter(l => l.status === 'disbursed')
        .reduce((sum, l) => sum + (Number(l.total_due) - Number(l.total_paid || 0)), 0) || 0;

      const { data: clients } = await supabase
        .from('clients')
        .select('id');

      setStats({
        total_disbursed: disbursed,
        total_repaid: repaid,
        pending_amount: pending,
        total_clients: clients?.length || 0,
      });

      // Fetch recent loans
      const { data: loans } = await supabase
        .from('loans')
        .select('*, clients(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentLoans(loans || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" />
      <PaymentAlerts />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Link href="/clients/new">
          <Button>+ New Client</Button>
        </Link>
        <Link href="/loans/new">
          <Button>+ New Loan</Button>
        </Link>
        <Link href="/reports">
          <Button variant="secondary">📊 View Reports</Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <h2 className="text-xl font-bold text-primary mb-6">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentLoans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-secondary">
                    No loans found
                  </td>
                </tr>
              ) : (
                recentLoans.map((loan) => (
                  <tr key={loan.id} className="border-b border-sage hover:bg-cream transition-colors">
                    <td className="py-3 px-4">{loan.clients?.full_name || 'N/A'}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(loan.loan_amount)}</td>
                    <td className="py-3 px-4 capitalize">{loan.payment_plan}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                    <td className="py-3 px-4 text-sm">{formatDate(loan.created_at)}</td>
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