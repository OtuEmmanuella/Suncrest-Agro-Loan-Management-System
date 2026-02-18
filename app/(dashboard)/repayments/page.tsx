// app/(dashboard)/repayments/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';
import { useAuth } from '@/lib/hooks/useAuth';

interface Loan {
  id: string;
  loan_amount: number;
  total_due: number;
  total_paid: number;
  installment_amount: number;
  payment_plan: string;
  next_payment_date: string;
  clients?: {
    full_name: string;
  };
}

export default function RepaymentsPage() {
  const searchParams = useSearchParams();
  const preselectedLoanId = searchParams.get('loan');
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Added: Get current user
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountType, setAccountType] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceAfterPayment, setBalanceAfterPayment] = useState(0);
  const [paymentsReduced, setPaymentsReduced] = useState(0);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    if (preselectedLoanId && loans.length > 0) {
      const loan = loans.find(l => l.id === preselectedLoanId);
      if (loan) {
        setSelectedLoan(loan);
        setAmount(loan.installment_amount.toString());
      }
    }
  }, [preselectedLoanId, loans]);

  // Calculate balance after payment and payments reduced
  useEffect(() => {
    if (selectedLoan && amount) {
      const paymentAmount = Number(amount);
      const currentBalance = Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0);
      const remaining = currentBalance - paymentAmount;
      setBalanceAfterPayment(Math.max(0, remaining));
      
      // Calculate how many payments this saves
      if (paymentAmount > selectedLoan.installment_amount) {
        const overpayment = paymentAmount - selectedLoan.installment_amount;
        const paymentsSaved = Math.floor(overpayment / selectedLoan.installment_amount);
        setPaymentsReduced(paymentsSaved);
      } else {
        setPaymentsReduced(0);
      }
    } else if (selectedLoan) {
      const currentBalance = Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0);
      setBalanceAfterPayment(currentBalance);
      setPaymentsReduced(0);
    }
  }, [amount, selectedLoan]);

  const fetchActiveLoans = async () => {
    const { data } = await supabase
      .from('loans')
      .select('*, clients(full_name)')
      .eq('status', 'disbursed')
      .order('created_at', { ascending: false });

    setLoans(data || []);
  };

  const handleLoanSelect = (loan: Loan) => {
    setSelectedLoan(loan);
    setAmount(loan.installment_amount.toString());
  };

  const handleAmountChange = (value: string) => {
    if (value === '' || Number(value) >= 0) {
      setAmount(value);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const paymentAmount = Number(amount);
    const currentBalance = Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0);

    // Validation
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount < selectedLoan.installment_amount) {
      toast.error(`Minimum payment is ${formatCurrency(selectedLoan.installment_amount)}`);
      return;
    }

    if (paymentAmount > currentBalance) {
      toast.error(`Payment cannot exceed outstanding balance of ${formatCurrency(currentBalance)}`);
      return;
    }

    setLoading(true);
    try {
      // ============================================
      // USER TRACKING: Get current user's name
      // ============================================
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      const userName = profileData?.full_name || 'Unknown User';

      // ============================================
      // INSERT PAYMENT WITH USER TRACKING
      // ============================================
      const { data: paymentData, error } = await supabase
        .from('repayments')
        .insert([{
          loan_id: selectedLoan.id,
          amount: paymentAmount,
          payment_date: paymentDate,
          account_type: accountType,
          recorded_by: user?.id,              // NEW: Track who recorded it
          recorded_by_name: userName,         // NEW: Store their name
        }])
        .select()
        .single();

      if (error) throw error;

      // ============================================
      // AUDIT TRAIL: Log the payment recording
      // ============================================
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        user_name: userName,
        user_role: profileData?.role || 'manager',
        action: 'RECORD_PAYMENT',
        table_name: 'repayments',
        record_id: paymentData.id,
        new_data: {
          loan_id: selectedLoan.id,
          amount: paymentAmount,
          payment_date: paymentDate,
          account_type: accountType,
          client_name: selectedLoan.clients?.full_name,
        },
      }]);

      // ============================================
      // INVALIDATE CACHE
      // ============================================
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentLoans });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.loan(selectedLoan.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments(selectedLoan.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentAlerts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reportsStats });

      toast.success('Payment recorded successfully!');
      
      // Check if loan is fully paid
      if (balanceAfterPayment === 0) {
        toast.success('🎉 Loan fully repaid!', { duration: 5000 });
      } else if (paymentsReduced > 0) {
        toast.success(`⚡ Great! You saved ${paymentsReduced} payment${paymentsReduced !== 1 ? 's' : ''}!`, { duration: 5000 });
      }

      setAmount('');
      setAccountType('');
      setSelectedLoan(null);
      fetchActiveLoans();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Record Repayment" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loans List */}
        <Card>
          <h3 className="text-lg font-semibold text-primary mb-4">Active Loans</h3>
          <div className="space-y-3">
            {loans.length === 0 ? (
              <p className="text-center text-secondary py-8">No active loans</p>
            ) : (
              loans.map((loan) => {
                const balance = Number(loan.total_due) - Number(loan.total_paid || 0);
                const progress = (Number(loan.total_paid || 0) / Number(loan.total_due)) * 100;
                
                return (
                  <div
                    key={loan.id}
                    onClick={() => handleLoanSelect(loan)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedLoan?.id === loan.id
                        ? 'border-primary bg-lavender'
                        : 'border-sage hover:border-primary'
                    }`}
                  >
                    <div className="font-semibold text-primary">{loan.clients?.full_name}</div>
                    <div className="text-sm text-secondary mt-1">
                      Balance: <span className="font-semibold">{formatCurrency(balance)}</span>
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Total: {formatCurrency(loan.total_due)} | Paid: {formatCurrency(loan.total_paid || 0)}
                    </div>
                    
                    <div className="mt-2 bg-sage rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      {progress.toFixed(0)}% paid
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Payment Form */}
        <Card>
          <h3 className="text-lg font-semibold text-primary mb-4">Payment Details</h3>
          {!selectedLoan ? (
            <p className="text-secondary text-center py-8">Select a loan to record payment</p>
          ) : (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Loan Summary */}
              <div className="bg-lavender p-4 rounded-lg space-y-2">
                <div className="font-semibold text-lg">{selectedLoan.clients?.full_name}</div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <span className="text-secondary">Total Due:</span>
                    <div className="font-semibold">{formatCurrency(selectedLoan.total_due)}</div>
                  </div>
                  <div>
                    <span className="text-secondary">Already Paid:</span>
                    <div className="font-semibold text-green-600">{formatCurrency(selectedLoan.total_paid || 0)}</div>
                  </div>
                  <div>
                    <span className="text-secondary">Outstanding:</span>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0))}
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary">Next Payment Due:</span>
                    <div className="font-semibold">
                      {selectedLoan.next_payment_date ? formatDate(selectedLoan.next_payment_date) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expected Payment Amount */}
              <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
                <div className="text-sm text-blue-800 mb-1">Expected Payment Amount:</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(selectedLoan.installment_amount)}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  ({selectedLoan.payment_plan} installment)
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Payment Amount (₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={selectedLoan.installment_amount}
                  max={Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0)}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`Minimum: ${formatCurrency(selectedLoan.installment_amount)}`}
                  className="w-full px-4 py-3 rounded-lg border-2 border-sage bg-cream text-secondary text-lg font-semibold focus:outline-none focus:border-primary"
                  required
                />
                <div className="text-xs text-secondary mt-1">
                  Minimum: {formatCurrency(selectedLoan.installment_amount)} • 
                  Maximum: {formatCurrency(Number(selectedLoan.total_due) - Number(selectedLoan.total_paid || 0))}
                </div>
              </div>

              {/* Overpayment Benefit */}
              {amount && Number(amount) > selectedLoan.installment_amount && (
                <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-500">
                  <div className="text-sm font-semibold text-blue-800 mb-2">
                    ⚡ Extra Payment Benefit
                  </div>
                  <div className="text-sm text-blue-700">
                    You're paying <strong>{formatCurrency(Number(amount) - selectedLoan.installment_amount)}</strong> extra!
                  </div>
                  {paymentsReduced > 0 && (
                    <div className="text-sm text-blue-700 mt-1">
                      This reduces the loan by approximately <strong>{paymentsReduced} payment{paymentsReduced !== 1 ? 's' : ''}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Balance After Payment */}
              {amount && Number(amount) > 0 && (
                <div className={`p-4 rounded-lg border-2 ${
                  balanceAfterPayment === 0 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="text-sm font-semibold mb-2">
                    {balanceAfterPayment === 0 ? '✅ After This Payment:' : 'Balance After This Payment:'}
                  </div>
                  {balanceAfterPayment === 0 ? (
                    <div>
                      <div className="text-2xl font-bold text-green-700">FULLY PAID! 🎉</div>
                      <div className="text-sm text-green-600 mt-1">This loan will be marked as completed</div>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-yellow-700">
                      {formatCurrency(balanceAfterPayment)}
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />

              <Input
                label="Account/Method"
                type="text"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                placeholder="e.g., Bank Transfer, Cash, POS"
                required
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}