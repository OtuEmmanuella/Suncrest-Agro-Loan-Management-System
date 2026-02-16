// app/(dashboard)/reports/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatting';

export default function ReportsPage() {
  const [stats, setStats] = useState({
    total_disbursed: 0,
    total_repaid: 0,
    pending_amount: 0,
    daily_loans: 0,
    weekly_loans: 0,
    monthly_loans: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data: loans } = await supabase.from('loans').select('*');

    if (!loans) return;

    const disbursed = loans
      .filter(l => l.status === 'disbursed' || l.status === 'completed')
      .reduce((sum, l) => sum + Number(l.loan_amount), 0);

    const repaid = loans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);

    const pending = loans
      .filter(l => l.status === 'disbursed')
      .reduce((sum, l) => sum + (Number(l.total_due) - Number(l.total_paid || 0)), 0);

    const daily = loans.filter(l => l.payment_plan === 'daily').length;
    const weekly = loans.filter(l => l.payment_plan === 'weekly').length;
    const monthly = loans.filter(l => l.payment_plan === 'monthly').length;

    setStats({
      total_disbursed: disbursed,
      total_repaid: repaid,
      pending_amount: pending,
      daily_loans: daily,
      weekly_loans: weekly,
      monthly_loans: monthly,
    });
  };

  return (
    <div>
      <Header title="Reports & Analytics" />

      <div className="space-y-6">
        {/* Financial Overview */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Total Disbursed"
              value={stats.total_disbursed}
              icon="💰"
              isCurrency
            />
            <StatsCard
              title="Total Repaid"
              value={stats.total_repaid}
              icon="✅"
              isCurrency
            />
            <StatsCard
              title="Pending Amount"
              value={stats.pending_amount}
              icon="⏳"
              isCurrency
            />
          </div>
        </div>

        {/* Loan Distribution */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Loan Distribution by Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Daily Loans"
              value={stats.daily_loans}
              icon="📅"
            />
            <StatsCard
              title="Weekly Loans"
              value={stats.weekly_loans}
              icon="📊"
            />
            <StatsCard
              title="Monthly Loans"
              value={stats.monthly_loans}
              icon="📈"
            />
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <h3 className="text-lg font-semibold text-primary mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-sage">
              <span>Collection Rate:</span>
              <strong>
                {stats.total_disbursed > 0
                  ? ((stats.total_repaid / stats.total_disbursed) * 100).toFixed(2)
                  : 0}%
              </strong>
            </div>
            <div className="flex justify-between py-2 border-b border-sage">
              <span>Outstanding Balance:</span>
              <strong>{formatCurrency(stats.pending_amount)}</strong>
            </div>
            <div className="flex justify-between py-2">
              <span>Total Loans Issued:</span>
              <strong>{stats.daily_loans + stats.weekly_loans + stats.monthly_loans}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}