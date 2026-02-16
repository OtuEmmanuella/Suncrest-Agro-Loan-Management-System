// app/(dashboard)/reports/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { PaymentAlerts } from '@/components/dashboard/PaymentAlerts';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { useRouter } from 'next/navigation';

interface Stats {
  total_disbursed: number;
  total_repaid: number;
  pending_amount: number;
  daily_loans: number;
  weekly_loans: number;
  monthly_loans: number;
  new_clients_count: number;
  pending_disbursement_count: number;
  active_repayment_count: number;
}

interface Transaction {
  id: string;
  type: 'client' | 'loan' | 'payment';
  description: string;
  amount?: number;
  date: string;
  user_name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    total_disbursed: 0,
    total_repaid: 0,
    pending_amount: 0,
    daily_loans: 0,
    weekly_loans: 0,
    monthly_loans: 0,
    new_clients_count: 0,
    pending_disbursement_count: 0,
    active_repayment_count: 0,
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data: loans } = await supabase.from('loans').select('*');
    const { data: clients } = await supabase.from('clients').select('created_at');
    const { data: payments } = await supabase.from('repayments').select('*');

    if (!loans) return;

    const disbursed = loans
      .filter(l => l.status === 'disbursed' || l.status === 'completed')
      .reduce((sum, l) => sum + Number(l.loan_amount), 0);

    const repaid = loans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);

    const pending = loans
      .filter(l => l.status === 'disbursed')
      .reduce((sum, l) => sum + (Number(l.total_due) - Number(l.total_paid || 0)), 0);

    // Count loans by plan
    const daily = loans.filter(l => l.payment_plan === 'daily').length;
    const weekly = loans.filter(l => l.payment_plan === 'weekly').length;
    const monthly = loans.filter(l => l.payment_plan === 'monthly').length;

    // Count new clients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClients = clients?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0;

    // Count pending disbursements
    const pendingLoans = loans.filter(l => l.status === 'pending').length;

    // Count active repayments
    const activeRepayments = loans.filter(l => l.status === 'disbursed').length;

    setStats({
      total_disbursed: disbursed,
      total_repaid: repaid,
      pending_amount: pending,
      daily_loans: daily,
      weekly_loans: weekly,
      monthly_loans: monthly,
      new_clients_count: newClients,
      pending_disbursement_count: pendingLoans,
      active_repayment_count: activeRepayments,
    });
  };

  const handleSearch = async () => {
    const transactions: Transaction[] = [];

    let query = supabase.from('clients').select('id, full_name, created_at, created_by');
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    if (filterType === 'all' || filterType === 'clients') {
      const { data: clients } = await query;
      clients?.forEach(c => {
        transactions.push({
          id: c.id,
          type: 'client',
          description: `New client registered: ${c.full_name}`,
          date: c.created_at,
          user_name: 'System', // You'd fetch this from user_profiles
        });
      });
    }

    if (filterType === 'all' || filterType === 'loans') {
      let loanQuery = supabase
        .from('loans')
        .select('id, loan_amount, status, created_at, clients(full_name)');
      
      if (startDate) loanQuery = loanQuery.gte('created_at', startDate);
      if (endDate) loanQuery = loanQuery.lte('created_at', endDate);

      const { data: loans } = await loanQuery;
      loans?.forEach(l => {
        transactions.push({
          id: l.id,
          type: 'loan',
          description: `Loan ${l.status}: ${l.clients?.full_name}`,
          amount: l.loan_amount,
          date: l.created_at,
          user_name: 'System',
        });
      });
    }

    if (filterType === 'all' || filterType === 'payments') {
  let paymentQuery = supabase
    .from('repayments')
    .select('id, amount, payment_date, created_at, loans(clients(full_name))');
  
  if (startDate) paymentQuery = paymentQuery.gte('payment_date', startDate);
  if (endDate) paymentQuery = paymentQuery.lte('payment_date', endDate);

  const { data: payments } = await paymentQuery;
  payments?.forEach(payment => {
    const clientName = (payment.loans as any)?.clients?.full_name || 'Unknown';
    transactions.push({
      id: payment.id,
      type: 'payment',
      description: `Payment received: ${clientName}`,
      amount: payment.amount,
      date: payment.payment_date,
      user_name: 'System',
    });
  });
}

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(transactions);
  };

  const handleLoanPlanClick = (plan: 'daily' | 'weekly' | 'monthly') => {
    router.push(`/loans?plan=${plan}`);
  };

  return (
    <div>
      <Header title="Reports & Analytics" />

      <PaymentAlerts />

      {/* Financial Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard title="Total Disbursed" value={stats.total_disbursed} icon="💰" isCurrency />
          <StatsCard title="Total Repaid" value={stats.total_repaid} icon="✅" isCurrency />
          <StatsCard title="Pending Amount" value={stats.pending_amount} icon="⏳" isCurrency />
        </div>
      </div>

      {/* Loan Distribution (Clickable) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Loan Distribution by Plan (Click to View)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => handleLoanPlanClick('daily')} className="cursor-pointer">
            <StatsCard title="Daily Loans" value={stats.daily_loans} icon="📅" />
          </div>
          <div onClick={() => handleLoanPlanClick('weekly')} className="cursor-pointer">
            <StatsCard title="Weekly Loans" value={stats.weekly_loans} icon="📊" />
          </div>
          <div onClick={() => handleLoanPlanClick('monthly')} className="cursor-pointer">
            <StatsCard title="Monthly Loans" value={stats.monthly_loans} icon="📈" />
          </div>
        </div>
      </div>

      {/* Transaction Search */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Search Transactions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Select
              label="Filter By"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'All Transactions' },
                { value: 'clients', label: 'New Clients' },
                { value: 'loans', label: 'Loans' },
                { value: 'payments', label: 'Payments' },
              ]}
            />
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                Search
              </Button>
            </div>
          </div>

          {/* Results */}
          {transactions.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Results ({transactions.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map(t => (
                  <div key={t.id} className="p-3 bg-cream rounded-lg border border-sage flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{t.description}</div>
                      <div className="text-sm text-secondary">
                        {formatDate(t.date)} • by {t.user_name}
                      </div>
                    </div>
                    {t.amount && (
                      <div className="font-semibold text-green-600">
                        {formatCurrency(t.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}