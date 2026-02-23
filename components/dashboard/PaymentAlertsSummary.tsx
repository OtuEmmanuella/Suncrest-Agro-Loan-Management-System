// components/dashboard/PaymentAlertsSummary.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';

interface AlertCounts {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  total: number;
}

export function PaymentAlertsSummary() {
  const router = useRouter();

  const { data: counts = { overdue: 0, dueToday: 0, dueSoon: 0, total: 0 } } = useQuery({
    queryKey: QUERY_KEYS.paymentAlerts,
    queryFn: async (): Promise<AlertCounts> => {
      const { data: loans } = await supabase
        .from('loans')
        .select('id, next_payment_date')
        .eq('status', 'disbursed')
        .not('next_payment_date', 'is', null)
        .limit(100);

      if (!loans) return { overdue: 0, dueToday: 0, dueSoon: 0, total: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let overdue = 0;
      let dueToday = 0;
      let dueSoon = 0;

      loans.forEach((loan) => {
        const dueDate = new Date(loan.next_payment_date!);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          overdue++;
        } else if (diffDays === 0) {
          dueToday++;
        } else if (diffDays <= 3) {
          dueSoon++;
        }
      });

      return {
        overdue,
        dueToday,
        dueSoon,
        total: overdue + dueToday + dueSoon,
      };
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  if (counts.total === 0) return null;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left side - Counts */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {/* Overdue */}
          {counts.overdue > 0 && (
            <div className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="text-red-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{counts.overdue}</div>
                <div className="text-xs text-secondary">Overdue</div>
              </div>
            </div>
          )}

          {/* Due Today */}
          {counts.dueToday > 0 && (
            <div className="flex items-center gap-2">
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertTriangle className="text-yellow-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{counts.dueToday}</div>
                <div className="text-xs text-secondary">Due Today</div>
              </div>
            </div>
          )}

          {/* Due Soon (3 days) */}
          {counts.dueSoon > 0 && (
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{counts.dueSoon}</div>
                <div className="text-xs text-secondary">Due Soon</div>
              </div>
            </div>
          )}
        </div>

        {/* Right side - View All button */}
        <Button 
          onClick={() => router.push('/payment-alerts')}
          variant="secondary"
        >
          View All ({counts.total})
        </Button>
      </div>
    </Card>
  );
}