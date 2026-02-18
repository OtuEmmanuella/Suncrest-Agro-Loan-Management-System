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
  type: 'client' | 'loan_disbursed' | 'loan_pending' | 'payment';
  description: string;
  amount?: number;
  date: string;
  user_name: string;
  link?: string;
  payment_plan?: string;
}

interface DuePayment {
  id: string;
  client_name: string;
  loan_amount: number;
  balance: number;
  next_payment_date: string;
  installment_amount: number;
  payment_plan: string;
  days_overdue: number;
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
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searching, setSearching] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data: loans } = await supabase.from('loans').select('*');
    const { data: clients } = await supabase.from('clients').select('created_at');

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClients = clients?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0;

    const pendingLoans = loans.filter(l => l.status === 'pending').length;
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
    setSearching(true);
    const newTransactions: Transaction[] = [];
    let calculatedTotal = 0;

    try {
      // Handle Due Payments Filters
      if (filterType.startsWith('due_')) {
        const plan = filterType.replace('due_', '');
        
        let query = supabase
          .from('loans')
          .select('id, installment_amount, next_payment_date, total_due, total_paid, payment_plan, clients(full_name)')
          .eq('status', 'disbursed')
          .not('next_payment_date', 'is', null);

        if (plan !== 'all') {
          query = query.eq('payment_plan', plan);
        }

        const { data: loans } = await query;
        
        if (loans) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dueList: DuePayment[] = [];
          
          loans.forEach(loan => {
            const dueDate = new Date(loan.next_payment_date!);
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = today.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) { // Overdue or due today
              const balance = Number(loan.total_due) - Number(loan.total_paid || 0);
              const clientName = (loan.clients as any)?.full_name || 'Unknown';
              
              dueList.push({
                id: loan.id,
                client_name: clientName,
                loan_amount: loan.total_due,
                balance: balance,
                next_payment_date: loan.next_payment_date!,
                installment_amount: loan.installment_amount,
                payment_plan: loan.payment_plan,
                days_overdue: diffDays,
              });
              
              calculatedTotal += loan.installment_amount;
            }
          });
          
          setDuePayments(dueList);
          setTotalAmount(calculatedTotal);
        }
      }
      // Handle Payment Filters with Plan
      else if (filterType.startsWith('payments_')) {
        const plan = filterType.replace('payments_', '');
        
        let paymentQuery = supabase
          .from('repayments')
          .select('id, amount, payment_date, loans(id, payment_plan, clients(full_name))');
        
        if (startDate) paymentQuery = paymentQuery.gte('payment_date', startDate);
        if (endDate) paymentQuery = paymentQuery.lte('payment_date', `${endDate}T23:59:59`);

        const { data: payments } = await paymentQuery;
        
        payments?.forEach(payment => {
          const loanPlan = (payment.loans as any)?.payment_plan;
          
          if (plan === 'all' || loanPlan === plan) {
            const clientName = (payment.loans as any)?.clients?.full_name || 'Unknown';
            const loanId = (payment.loans as any)?.id;
            
            newTransactions.push({
              id: payment.id,
              type: 'payment',
              description: `Payment from ${clientName}`,
              amount: payment.amount,
              date: payment.payment_date,
              user_name: 'System',
              link: loanId ? `/loans/${loanId}` : undefined,
              payment_plan: loanPlan,
            });
            
            calculatedTotal += Number(payment.amount);
          }
        });
      }
      // Original Filters
      else {
        if (filterType === 'all' || filterType === 'clients') {
          let query = supabase.from('clients').select('id, full_name, created_at');
          if (startDate) query = query.gte('created_at', startDate);
          if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

          const { data: clients } = await query;
          clients?.forEach(c => {
            newTransactions.push({
              id: c.id,
              type: 'client',
              description: `New client: ${c.full_name}`,
              date: c.created_at,
              user_name: 'System',
              link: `/clients/${c.id}`,
            });
          });
        }

        if (filterType === 'all' || filterType === 'disbursed') {
          let loanQuery = supabase
            .from('loans')
            .select('id, loan_amount, total_due, disbursed_date, clients(full_name)')
            .eq('status', 'disbursed')
            .not('disbursed_date', 'is', null);
          
          if (startDate) loanQuery = loanQuery.gte('disbursed_date', startDate);
          if (endDate) loanQuery = loanQuery.lte('disbursed_date', `${endDate}T23:59:59`);

          const { data: loans } = await loanQuery;
          loans?.forEach(l => {
            const clientName = (l.clients as any)?.full_name || 'Unknown';
            newTransactions.push({
              id: l.id,
              type: 'loan_disbursed',
              description: `Loan disbursed to ${clientName}`,
              amount: l.total_due,
              date: l.disbursed_date!,
              user_name: 'System',
              link: `/loans/${l.id}`,
            });
            calculatedTotal += Number(l.total_due);
          });
        }

        if (filterType === 'all' || filterType === 'pending') {
          let pendingQuery = supabase
            .from('loans')
            .select('id, loan_amount, total_due, created_at, clients(full_name)')
            .eq('status', 'pending');
          
          if (startDate) pendingQuery = pendingQuery.gte('created_at', startDate);
          if (endDate) pendingQuery = pendingQuery.lte('created_at', `${endDate}T23:59:59`);

          const { data: pendingLoans } = await pendingQuery;
          pendingLoans?.forEach(l => {
            const clientName = (l.clients as any)?.full_name || 'Unknown';
            newTransactions.push({
              id: l.id,
              type: 'loan_pending',
              description: `Pending: ${clientName}`,
              amount: l.total_due,
              date: l.created_at,
              user_name: 'System',
              link: `/loans/pending`,
            });
            calculatedTotal += Number(l.total_due);
          });
        }

        if (filterType === 'payments') {
          let paymentQuery = supabase
            .from('repayments')
            .select('id, amount, payment_date, loans(id, clients(full_name))');
          
          if (startDate) paymentQuery = paymentQuery.gte('payment_date', startDate);
          if (endDate) paymentQuery = paymentQuery.lte('payment_date', `${endDate}T23:59:59`);

          const { data: payments } = await paymentQuery;
          payments?.forEach(payment => {
            const clientName = (payment.loans as any)?.clients?.full_name || 'Unknown';
            const loanId = (payment.loans as any)?.id;
            newTransactions.push({
              id: payment.id,
              type: 'payment',
              description: `Payment from ${clientName}`,
              amount: payment.amount,
              date: payment.payment_date,
              user_name: 'System',
              link: loanId ? `/loans/${loanId}` : undefined,
            });
            calculatedTotal += Number(payment.amount);
          });
        }
      }

      newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(newTransactions);
      setTotalAmount(calculatedTotal);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleLoanPlanClick = (plan: 'daily' | 'weekly' | 'monthly') => {
    router.push(`/loans/filtered?plan=${plan}`);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'client': return '👤';
      case 'loan_disbursed': return '💰';
      case 'loan_pending': return '⏸️';
      case 'payment': return '✅';
      default: return '📄';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-50 border-blue-200';
      case 'loan_disbursed': return 'bg-green-50 border-green-200';
      case 'loan_pending': return 'bg-yellow-50 border-yellow-200';
      case 'payment': return 'bg-purple-50 border-purple-200';
      default: return 'bg-cream border-sage';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Reports & Analytics" />

      <PaymentAlerts />

      {/* Financial Overview */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-3">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Total Disbursed" value={stats.total_disbursed} icon="💰" isCurrency />
          <StatsCard title="Total Repaid" value={stats.total_repaid} icon="✅" isCurrency />
          <StatsCard title="Pending Amount" value={stats.pending_amount} icon="⏳" isCurrency />
        </div>
      </div>

      {/* Loan Distribution */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-3">Loan Distribution by Plan (Click to View)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => handleLoanPlanClick('daily')} className="cursor-pointer hover:opacity-80 transition">
            <StatsCard title="Daily Loans" value={stats.daily_loans} icon="📅" />
          </div>
          <div onClick={() => handleLoanPlanClick('weekly')} className="cursor-pointer hover:opacity-80 transition">
            <StatsCard title="Weekly Loans" value={stats.weekly_loans} icon="📊" />
          </div>
          <div onClick={() => handleLoanPlanClick('monthly')} className="cursor-pointer hover:opacity-80 transition">
            <StatsCard title="Monthly Loans" value={stats.monthly_loans} icon="📈" />
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary mb-3">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="New Clients (30 days)" value={stats.new_clients_count} icon="👤" />
          <StatsCard title="Pending Disbursement" value={stats.pending_disbursement_count} icon="⏸️" />
          <StatsCard title="Active Repayments" value={stats.active_repayment_count} icon="🔄" />
        </div>
      </div>

      {/* Transaction Search */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-base font-semibold text-primary mb-3">Search & Filter</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
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
                { value: 'disbursed', label: 'Loans Disbursed' },
                { value: 'pending', label: 'Pending Disbursements' },
                { value: 'payments', label: 'All Payments' },
                { value: 'payments_daily', label: 'Daily Plan Payments' },
                { value: 'payments_weekly', label: 'Weekly Plan Payments' },
                { value: 'payments_monthly', label: 'Monthly Plan Payments' },
                { value: 'due_all', label: 'All Due Payments' },
                { value: 'due_daily', label: 'Daily Plan Due' },
                { value: 'due_weekly', label: 'Weekly Plan Due' },
                { value: 'due_monthly', label: 'Monthly Plan Due' },
              ]}
            />
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={searching} className="w-full">
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Due Payments Results */}
          {filterType.startsWith('due_') && duePayments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">
                Due Payments ({duePayments.length}) - {filterType.replace('due_', '').toUpperCase()} PLAN
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {duePayments.map(payment => (
                  <div
                    key={payment.id}
                    onClick={() => router.push(`/loans/${payment.id}`)}
                    className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                      payment.days_overdue > 7 
                        ? 'bg-red-50 border-red-300' 
                        : payment.days_overdue > 3
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <div className="font-semibold">{payment.client_name}</div>
                        <div className="text-xs text-secondary">
                          {payment.days_overdue === 0 ? 'Due Today' : `${payment.days_overdue} days overdue`} • 
                          Due: {formatDate(payment.next_payment_date)} • 
                          {payment.payment_plan.toUpperCase()} Plan
                        </div>
                        <div className="text-xs mt-1">
                          Expected: <strong>{formatCurrency(payment.installment_amount)}</strong> • 
                          Balance: <strong>{formatCurrency(payment.balance)}</strong>
                        </div>
                      </div>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(payment.installment_amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Due Payments Total */}
              <div className="mt-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-red-900">Total Due Amount:</span>
                  <span className="text-xl font-bold text-red-900">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Results */}
          {!filterType.startsWith('due_') && transactions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Results ({transactions.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map(t => (
                  <div
                    key={`${t.type}-${t.id}`}
                    onClick={() => t.link && router.push(t.link)}
                    className={`p-3 rounded-lg border-2 ${getTransactionColor(t.type)} ${
                      t.link ? 'cursor-pointer hover:shadow-md' : ''
                    } transition-all flex justify-between items-center text-sm`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-xl">{getTransactionIcon(t.type)}</div>
                      <div>
                        <div className="font-semibold">{t.description}</div>
                        <div className="text-xs text-secondary">
                          {formatDate(t.date)} • by {t.user_name}
                          {t.payment_plan && ` • ${t.payment_plan.toUpperCase()} Plan`}
                        </div>
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
              
              {/* Transaction Total */}
              {totalAmount > 0 && (
                <div className="mt-4 p-4 bg-green-100 border-2 border-green-400 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-900">Total Amount:</span>
                    <span className="text-xl font-bold text-green-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {(transactions.length === 0 && duePayments.length === 0) && !searching && (startDate || filterType !== 'all') && (
            <div className="text-center py-8 text-secondary">
              No results found for the selected criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}