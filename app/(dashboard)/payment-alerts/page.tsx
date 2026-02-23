// app/(dashboard)/payment-alerts/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { getClientName, getClientId } from '@/lib/utils/supabase-helpers';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock, AlertTriangle, ArrowLeft, Search } from 'lucide-react';

interface LoanAlert {
  id: string;
  client_id: string;
  client_name: string;
  installment_amount: number;
  next_payment_date: string;
  balance_remaining: number;
  days_until_due: number;
  status: 'overdue' | 'due-today' | 'due-soon';
}

export default function PaymentAlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<LoanAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<LoanAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-today' | 'due-soon'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.client_name.toLowerCase().includes(query)
      );
    }

    setFilteredAlerts(filtered);
  }, [alerts, filterStatus, searchQuery]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data: loans } = await supabase
        .from('loans')
        .select('id, installment_amount, next_payment_date, total_due, total_paid, clients(id, full_name)')
        .eq('status', 'disbursed')
        .not('next_payment_date', 'is', null)
        .limit(100);

      if (!loans) {
        setAlerts([]);
        setFilteredAlerts([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alertsList: LoanAlert[] = [];

      loans.forEach((loan) => {
        const dueDate = new Date(loan.next_payment_date!);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const balance = Number(loan.total_due) - Number(loan.total_paid || 0);

        let status: 'overdue' | 'due-today' | 'due-soon';
        if (diffDays < 0) {
          status = 'overdue';
        } else if (diffDays === 0) {
          status = 'due-today';
        } else if (diffDays <= 3) {
          status = 'due-soon';
        } else {
          return;
        }

        alertsList.push({
          id: loan.id,
          client_id: getClientId(loan.clients),
          client_name: getClientName(loan.clients),
          installment_amount: loan.installment_amount,
          next_payment_date: loan.next_payment_date!,
          balance_remaining: balance,
          days_until_due: diffDays,
          status,
        });
      });

      alertsList.sort((a, b) => {
        const order = { overdue: 0, 'due-today': 1, 'due-soon': 2 };
        return order[a.status] - order[b.status];
      });

      setAlerts(alertsList);
      setFilteredAlerts(alertsList);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPayment = (loanId: string) => {
    router.push(`/repayments?loan=${loanId}`);
  };

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          textColor: 'text-red-600',
          icon: <AlertCircle size={16} className="text-red-600" />,
        };
      case 'due-today':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-500',
          textColor: 'text-yellow-600',
          icon: <AlertTriangle size={16} className="text-yellow-600" />,
        };
      case 'due-soon':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500',
          textColor: 'text-blue-600',
          icon: <Clock size={16} className="text-blue-600" />,
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-500',
          textColor: 'text-gray-600',
          icon: null,
        };
    }
  };

  const counts = {
    overdue: alerts.filter(a => a.status === 'overdue').length,
    dueToday: alerts.filter(a => a.status === 'due-today').length,
    dueSoon: alerts.filter(a => a.status === 'due-soon').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-secondary">Loading payment alerts...</div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Payment Alerts" 
        subtitle="Manage upcoming and overdue payments"
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 text-white rounded-full p-3">
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="text-sm text-red-700">Overdue</div>
              <div className="text-2xl font-bold text-red-900">{counts.overdue}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 text-white rounded-full p-3">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-sm text-yellow-700">Due Today</div>
              <div className="text-2xl font-bold text-yellow-900">{counts.dueToday}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white rounded-full p-3">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-sm text-blue-700">Due Soon (3 days)</div>
              <div className="text-2xl font-bold text-blue-900">{counts.dueSoon}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-sage rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-sage text-secondary hover:bg-primary/20'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterStatus('overdue')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'overdue'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Overdue ({counts.overdue})
            </button>
            <button
              onClick={() => setFilterStatus('due-today')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'due-today'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              }`}
            >
              Today ({counts.dueToday})
            </button>
            <button
              onClick={() => setFilterStatus('due-soon')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filterStatus === 'due-soon'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              Soon ({counts.dueSoon})
            </button>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <Card>
        <h3 className="text-lg font-semibold text-primary mb-4">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </h3>

        {filteredAlerts.length === 0 ? (
          <p className="text-center text-secondary py-8">
            {searchQuery || filterStatus !== 'all'
              ? 'No alerts match your filters'
              : 'No payment alerts at this time'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = getStatusConfig(alert.status);
              
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {config.icon}
                        <button
                          onClick={() => handleViewClient(alert.client_id)}
                          className="font-semibold hover:underline"
                        >
                          {alert.client_name}
                        </button>
                      </div>
                      <div className={`text-sm ${config.textColor} font-semibold`}>
                        {alert.status === 'overdue' && (
                          <span>OVERDUE by {Math.abs(alert.days_until_due)} day(s)</span>
                        )}
                        {alert.status === 'due-today' && <span>DUE TODAY</span>}
                        {alert.status === 'due-soon' && (
                          <span>Due in {alert.days_until_due} day(s)</span>
                        )}
                        {' • '}
                        <span className="text-secondary">{formatDate(alert.next_payment_date)}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-secondary">
                        <div>
                          Expected Payment: <strong className="text-primary">{formatCurrency(alert.installment_amount)}</strong>
                        </div>
                        <div>
                          Remaining Balance: <strong className="text-primary">{formatCurrency(alert.balance_remaining)}</strong>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleQuickPayment(alert.id)}
                    >
                      Record Payment
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}