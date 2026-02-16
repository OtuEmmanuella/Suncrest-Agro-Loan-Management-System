// app/(dashboard)/loans/filtered/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { ArrowLeft } from 'lucide-react';

interface Loan {
  id: string;
  loan_amount: number;
  total_due: number;
  total_paid: number;
  payment_plan: string;
  status: string;
  created_at: string;
  clients?: {
    id: string;
    full_name: string;
  };
}

export default function FilteredLoansPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') as 'daily' | 'weekly' | 'monthly';
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plan) {
      fetchLoans();
    }
  }, [plan]);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*, clients(id, full_name)')
        .eq('payment_plan', plan)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div>
      <Header 
        title={`${plan?.charAt(0).toUpperCase()}${plan?.slice(1)} Loans`}
        subtitle={`All loans with ${plan} payment plan`}
        action={
          <Button variant="secondary" onClick={() => router.push('/reports')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Reports
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Total Due</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Paid</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Balance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Created</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-secondary">
                    No {plan} loans found
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const balance = Number(loan.total_due) - Number(loan.total_paid || 0);
                  return (
                    <tr 
                      key={loan.id}
                      onClick={() => router.push(`/clients/${loan.clients?.id}`)}
                      className="border-b border-sage hover:bg-cream transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold">{loan.clients?.full_name || 'N/A'}</td>
                      <td className="py-3 px-4">{formatCurrency(loan.loan_amount)}</td>
                      <td className="py-3 px-4">{formatCurrency(loan.total_due)}</td>
                      <td className="py-3 px-4 text-green-600">{formatCurrency(loan.total_paid || 0)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(balance)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            loan.status === 'disbursed'
                              ? 'bg-green-100 text-green-700'
                              : loan.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(loan.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}