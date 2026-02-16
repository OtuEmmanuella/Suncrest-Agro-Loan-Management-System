// app/(dashboard)/loans/pending/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Loan } from '@/types';

export default function PendingLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingLoans();
  }, []);

  const fetchPendingLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*, clients(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching pending loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ 
          status: 'disbursed',
          disbursed_date: new Date().toISOString()
        })
        .eq('id', loanId);

      if (error) throw error;

      toast.success('Loan disbursed successfully!');
      fetchPendingLoans(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || 'Failed to disburse loan');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div>
      <Header title="Pending Disbursements" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Loan Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Total Due</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Payment Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Created</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-secondary">
                    No pending loans
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-sage hover:bg-cream transition-colors">
                    <td className="py-3 px-4 font-semibold">{loan.clients?.full_name || 'N/A'}</td>
                    <td className="py-3 px-4">{formatCurrency(loan.loan_amount)}</td>
                    <td className="py-3 px-4">{formatCurrency(loan.total_due)}</td>
                    <td className="py-3 px-4 capitalize">{loan.payment_plan}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(loan.created_at)}</td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        onClick={() => handleDisburse(loan.id)}
                      >
                        Disburse
                      </Button>
                    </td>
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