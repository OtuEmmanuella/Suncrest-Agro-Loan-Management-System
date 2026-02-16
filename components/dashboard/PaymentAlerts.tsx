// components/dashboard/PaymentAlerts.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock } from 'lucide-react';

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

export function PaymentAlerts() {
  const [alerts, setAlerts] = useState<LoanAlert[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every minute
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    const { data: loans } = await supabase
      .from('loans')
      .select('*, clients(id, full_name)')
      .eq('status', 'disbursed');

    if (!loans) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alertsList: LoanAlert[] = [];

    loans.forEach((loan) => {
      if (!loan.next_payment_date) return;

      const dueDate = new Date(loan.next_payment_date);
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
        client_id: loan.clients?.id,
        client_name: loan.clients?.full_name || 'Unknown',
        installment_amount: loan.installment_amount,
        next_payment_date: loan.next_payment_date,
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
  };

  if (alerts.length === 0) return null;

  const handleQuickPayment = (loanId: string) => {
    router.push(`/repayments?loan=${loanId}`);
  };

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
        <AlertCircle className="text-red-500" size={20} />
        Payment Alerts ({alerts.length})
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-2 ${
              alert.status === 'overdue'
                ? 'border-red-500 bg-red-50'
                : alert.status === 'due-today'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-blue-500 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {alert.status === 'overdue' ? (
                    <AlertCircle size={16} className="text-red-600" />
                  ) : (
                    <Clock size={16} className={alert.status === 'due-today' ? 'text-yellow-600' : 'text-blue-600'} />
                  )}
                  <button
                    onClick={() => handleViewClient(alert.client_id)}
                    className="font-semibold hover:underline"
                  >
                    {alert.client_name}
                  </button>
                </div>
                <div className="text-sm text-secondary">
                  {alert.status === 'overdue' && (
                    <span className="text-red-600 font-semibold">
                      OVERDUE by {Math.abs(alert.days_until_due)} day(s)
                    </span>
                  )}
                  {alert.status === 'due-today' && (
                    <span className="text-yellow-600 font-semibold">DUE TODAY</span>
                  )}
                  {alert.status === 'due-soon' && (
                    <span className="text-blue-600 font-semibold">
                      Due in {alert.days_until_due} day(s)
                    </span>
                  )}
                  {' • '}
                  {formatDate(alert.next_payment_date)}
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div>
                    Expected: <strong>{formatCurrency(alert.installment_amount)}</strong>
                  </div>
                  <div>
                    Balance: <strong>{formatCurrency(alert.balance_remaining)}</strong>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleQuickPayment(alert.id)}
                className="ml-4"
              >
                Pay Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}