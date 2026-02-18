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
      // ============================================
      // GET CURRENT USER INFO
      // ============================================
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Get user's name from profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      const userName = profileData?.full_name || 'Unknown User';

      // ============================================
      // UPDATE LOAN WITH USER TRACKING
      // ============================================
      const { error } = await supabase
        .from('loans')
        .update({ 
          status: 'disbursed',
          disbursed_date: new Date().toISOString(),
          disbursed_by: user.id,
          disbursed_by_name: userName,
        })
        .eq('id', loanId);

      if (error) throw error;

      // ============================================
      // AUDIT TRAIL
      // ============================================
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        user_name: userName,
        user_role: profileData?.role || 'manager',
        action: 'DISBURSE_LOAN',
        table_name: 'loans',
        record_id: loanId,
        new_data: {
          status: 'disbursed',
          disbursed_date: new Date().toISOString(),
          disbursed_by_name: userName,
        },
      }]);

      toast.success('Loan disbursed successfully!');
      fetchPendingLoans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disburse loan');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Header title="Pending Disbursements" />

      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-sage">
                  <th className="text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Client</th>
                  <th className="text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Amount</th>
                  <th className="hidden md:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Total Due</th>
                  <th className="hidden sm:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Plan</th>
                  <th className="hidden lg:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Created</th>
                  <th className="text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-secondary text-sm">
                      No pending loans
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="border-b border-sage hover:bg-cream transition-colors">
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold truncate max-w-[100px] sm:max-w-none">
                        {loan.clients?.full_name || 'N/A'}
                      </td>
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(loan.loan_amount)}
                      </td>
                      <td className="hidden md:table-cell py-2 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(loan.total_due)}
                      </td>
                      <td className="hidden sm:table-cell py-2 px-2 sm:px-4 text-xs sm:text-sm capitalize">
                        {loan.payment_plan}
                      </td>
                      <td className="hidden lg:table-cell py-2 px-2 sm:px-4 text-xs">
                        {formatDate(loan.created_at)}
                      </td>
                      <td className="py-2 px-2 sm:px-4">
                        <Button
                          size="sm"
                          onClick={() => handleDisburse(loan.id)}
                          className="text-xs"
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
        </div>
      </Card>
    </div>
  );
}