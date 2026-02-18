// app/(dashboard)/loans/new/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatting';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';

interface LoanFormData {
  client_id: string;
  loan_amount: number;
  interest_amount: number; // CHANGED from interest_rate
  payment_plan: 'daily' | 'weekly' | 'monthly';
  duration_months: number;
  repayment_start_date: string;
  status: 'pending' | 'disbursed';
}

interface Client {
  id: string;
  full_name: string;
  phone_number: string;
}

export default function NewLoanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [numberOfPayments, setNumberOfPayments] = useState(0);
  const [interestRate, setInterestRate] = useState(0); // For display purposes
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoanFormData>({
    defaultValues: {
      status: 'pending',
      payment_plan: 'weekly',
      interest_amount: 0,
      duration_months: 3,
      repayment_start_date: new Date().toISOString().split('T')[0],
    }
  });

  const loanAmount = watch('loan_amount');
  const interestAmount = watch('interest_amount'); // CHANGED
  const paymentPlan = watch('payment_plan');
  const durationMonths = watch('duration_months');

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate loan details
  useEffect(() => {
    if (loanAmount && interestAmount !== undefined && paymentPlan && durationMonths) {
      const principal = Number(loanAmount);
      const interest = Number(interestAmount);
      const total = principal + interest;
      
      // Calculate interest rate percentage for display
      const rate = principal > 0 ? (interest / principal) * 100 : 0;
      setInterestRate(rate);
      
      // Calculate number of payments based on plan and duration
      let payments = 0;
      switch (paymentPlan) {
        case 'daily':
          payments = durationMonths * 30;
          break;
        case 'weekly':
          payments = Math.ceil(durationMonths * 4.33);
          break;
        case 'monthly':
          payments = durationMonths;
          break;
      }
      
      const perPayment = total / payments;
      
      setTotalDue(total);
      setNumberOfPayments(payments);
      setInstallmentAmount(perPayment);
    }
  }, [loanAmount, interestAmount, paymentPlan, durationMonths]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, phone_number')
      .order('full_name');
    setClients(data || []);
  };

  const onSubmit = async (data: LoanFormData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    // ============================================
    // GET USER INFO FOR TRACKING
    // ============================================
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    const userName = profileData?.full_name || 'Unknown User';


      // Calculate interest rate percentage for storage
      const principal = Number(data.loan_amount);
      const interest = Number(data.interest_amount);
      const rate = principal > 0 ? (interest / principal) * 100 : 0;

     const { data: loanData, error } = await supabase.from('loans').insert([{
      client_id: data.client_id,
      loan_amount: principal,
      interest_rate: rate,
      total_due: totalDue,
      payment_plan: data.payment_plan,
      duration_months: data.duration_months,
      installment_amount: installmentAmount,
      repayment_start_date: data.repayment_start_date,
      next_payment_date: data.status === 'disbursed' ? data.repayment_start_date : null,
      status: data.status,
      disbursed_date: data.status === 'disbursed' ? new Date().toISOString() : null,
      created_by: user.id,
      created_by_name: userName,  // NEW
      disbursed_by: data.status === 'disbursed' ? user.id : null,
      disbursed_by_name: data.status === 'disbursed' ? userName : null,  // NEW
    }]).select().single();

      if (error) throw error;

       // Audit trail
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      user_name: userName,
      user_role: profileData?.role || 'manager',
      action: data.status === 'disbursed' ? 'CREATE_AND_DISBURSE_LOAN' : 'CREATE_LOAN',
      table_name: 'loans',
      record_id: loanData.id,
      new_data: {
        client_id: data.client_id,
        loan_amount: principal,
        interest_amount: interest,
        total_due: totalDue,
        status: data.status,
      },
    }]);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentLoans });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.loans });

      toast.success('Loan created successfully!');
      router.push('/loans');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create loan');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Header title="Create New Loan" subtitle="Loans / New" />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-4">Client Information</h3>
            <Select
              label="Select Client"
              {...register('client_id', { required: 'Client is required' })}
              error={errors.client_id?.message}
              options={[
                { value: '', label: 'Choose a client...' },
                ...clients.map(c => ({ 
                  value: c.id, 
                  label: `${c.full_name} - ${c.phone_number}` 
                }))
              ]}
              required
            />
          </div>

          {/* Loan Details */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-4 pb-3 border-b-2 border-sage">
              Loan Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Loan Amount (₦)"
                type="number"
                placeholder="50000"
                {...register('loan_amount', { required: 'Amount is required', min: 1 })}
                error={errors.loan_amount?.message}
                required
              />

              <Input
                label="Interest Amount (₦)"
                type="number"
                step="0.01"
                placeholder="5000"
                {...register('interest_amount', { required: 'Interest amount is required', min: 0 })}
                error={errors.interest_amount?.message}
                helperText={interestRate > 0 ? `Equivalent to ${interestRate.toFixed(2)}%` : 'Enter the interest amount'}
                required
              />

              <Input
                label="Duration (months)"
                type="number"
                placeholder="3"
                {...register('duration_months', { required: 'Duration is required', min: 1 })}
                error={errors.duration_months?.message}
                helperText="Total loan period in months"
                required
              />

              <Input
                label="Repayment Start Date"
                type="date"
                {...register('repayment_start_date', { required: 'Start date is required' })}
                error={errors.repayment_start_date?.message}
                helperText="When first payment is due"
                required
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-4 pb-3 border-b-2 border-sage">
              Payment Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Select
                label="Payment Plan"
                {...register('payment_plan', { required: true })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                required
              />

              <Select
                label="Disbursement Status"
                {...register('status', { required: true })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'disbursed', label: 'Disbursed' },
                ]}
                required
              />
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="bg-lavender p-4 sm:p-6 rounded-lg space-y-3">
            <h4 className="font-semibold text-primary mb-3">Loan Summary</h4>
            <div className="flex justify-between text-sm sm:text-base">
              <span>Principal Amount:</span>
              <strong>{formatCurrency(loanAmount || 0)}</strong>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span>Interest Amount {interestRate > 0 && `(${interestRate.toFixed(2)}%)`}:</span>
              <strong>{formatCurrency(interestAmount || 0)}</strong>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-bold text-primary pt-3 border-t-2 border-primary">
              <span>Total Repayable:</span>
              <strong>{formatCurrency(totalDue)}</strong>
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-primary/30 text-sm sm:text-base">
              <span>Number of Payments:</span>
              <strong>{numberOfPayments} {paymentPlan} payment(s)</strong>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-bold text-primary">
              <span>Per {paymentPlan === 'daily' ? 'Day' : paymentPlan === 'weekly' ? 'Week' : 'Month'}:</span>
              <strong>{formatCurrency(installmentAmount)}</strong>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Loan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}