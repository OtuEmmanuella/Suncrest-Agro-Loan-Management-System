// app/(dashboard)/loans/new/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatting';
import { calculatePaymentCount, convertToMonths } from '@/lib/utils/calculations';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';
import { useAuth } from '@/lib/hooks/useAuth';

type DurationUnit = 'days' | 'weeks' | 'months';
type PaymentPlan = 'daily' | 'weekly' | 'monthly';

interface LoanFormData {
  client_id: string;
  loan_amount: number;
  interest_amount: number;
  registration_fee: number; 
  admin_fee: number; 
  payment_plan: PaymentPlan;
  duration_value: number;
  duration_unit: DurationUnit;
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
  const { user } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [numberOfPayments, setNumberOfPayments] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoanFormData>({
    defaultValues: {
      status: 'pending',
      payment_plan: 'weekly',
      duration_unit: 'months',
      interest_amount: 0,
      duration_value: 3,
      repayment_start_date: new Date().toISOString().split('T')[0],
    }
  });

  const loanAmount = watch('loan_amount');
  const interestAmount = watch('interest_amount');
   const registrationFee = watch('registration_fee'); 
  const adminFee = watch('admin_fee'); 
  const paymentPlan = watch('payment_plan');
  const durationValue = watch('duration_value');
  const durationUnit = watch('duration_unit');

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculate loan details
  useEffect(() => {
    if (loanAmount && interestAmount !== undefined && paymentPlan && durationValue && durationUnit) {
      const principal = Number(loanAmount);
      const interest = Number(interestAmount);
      const regFee = Number(registrationFee || 0);
      const admFee = Number(adminFee || 0);

      // Total due = principal + interest (fees are separate)
      const total = principal + interest;
      
      // Calculate interest rate percentage for display
      const rate = principal > 0 ? (interest / principal) * 100 : 0;
      setInterestRate(rate);

       // Calculate total fees
      const fees = regFee + admFee;
      setTotalFees(fees);
      
      // Calculate number of payments using the new function
      const payments = calculatePaymentCount(
        Number(durationValue),
        durationUnit,
        paymentPlan
      );
      
      const perPayment = total / payments;
      
      setTotalDue(total);
      setNumberOfPayments(payments);
      setInstallmentAmount(perPayment);
    }
  }, [loanAmount, interestAmount, paymentPlan, durationValue, durationUnit]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, phone_number')
      .order('full_name');
    setClients(data || []);
  };

  const onSubmit = async (data: LoanFormData) => {
    try {
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Get user info for tracking
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      const userName = profileData?.full_name || 'Unknown User';

      // Calculate values
      const principal = Number(data.loan_amount);
      const interest = Number(data.interest_amount);
      const rate = principal > 0 ? (interest / principal) * 100 : 0;
      
      // Convert duration to months for backward compatibility
      const durationMonths = convertToMonths(
        Number(data.duration_value),
        data.duration_unit
      );

      const { data: loanData, error } = await supabase.from('loans').insert([{
        client_id: data.client_id,
        loan_amount: principal,
        interest_rate: rate,
        total_due: totalDue,
        payment_plan: data.payment_plan,
        duration_months: durationMonths, // Still store for compatibility
        duration_value: Number(data.duration_value), // NEW
        duration_unit: data.duration_unit, // NEW
        installment_amount: installmentAmount,
        repayment_start_date: data.repayment_start_date,
        next_payment_date: data.status === 'disbursed' ? data.repayment_start_date : null,
        status: data.status,
        disbursed_date: data.status === 'disbursed' ? new Date().toISOString() : null,
         registration_fee: Number(data.registration_fee || 0), // NEW
        admin_fee: Number(data.admin_fee || 0), // NEW
        registration_fee_paid: 0, // NEW
        admin_fee_paid: 0, // NEW
        created_by: user.id,
        created_by_name: userName,
        disbursed_by: data.status === 'disbursed' ? user.id : null,
        disbursed_by_name: data.status === 'disbursed' ? userName : null,
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
            registration_fee: data.registration_fee,
          admin_fee: data.admin_fee,
          total_due: totalDue,
          duration: `${data.duration_value} ${data.duration_unit}`,
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

              {/* NEW: Fee Fields */}
              <Input
                label="Registration Fee (₦) - Optional"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('registration_fee', { min: 0 })}
                error={errors.registration_fee?.message}
                helperText="One-time registration fee (if applicable)"
              />

              <Input
                label="Admin Fee (₦) - Optional"
                type="number"
                step="0.01"
                placeholder="0"
                {...register('admin_fee', { min: 0 })}
                error={errors.admin_fee?.message}
                helperText="One-time admin/processing fee (if applicable)"
              />
            </div>
          </div>

          {/* Duration Selection */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-4 pb-3 border-b-2 border-sage">
              Duration & Payment Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Input
                label="Duration Value"
                type="number"
                placeholder="20"
                {...register('duration_value', { required: 'Duration is required', min: 1 })}
                error={errors.duration_value?.message}
                required
              />

              <Select
                label="Duration Unit"
                {...register('duration_unit', { required: true })}
                options={[
                  { value: 'days', label: 'Days' },
                  { value: 'weeks', label: 'Weeks' },
                  { value: 'months', label: 'Months' },
                ]}
                required
              />

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4">
              <Input
                label="Repayment Start Date"
                type="date"
                {...register('repayment_start_date', { required: 'Start date is required' })}
                error={errors.repayment_start_date?.message}
                helperText="When first payment is due"
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
              <span>Interest {interestRate > 0 && `(${interestRate.toFixed(2)}%)`}:</span>
              <strong>{formatCurrency(interestAmount || 0)}</strong>
            </div>
            
            <div className="flex justify-between text-base sm:text-lg font-bold text-primary pt-3 border-t-2 border-primary">
              <span>Total Repayable:</span>
              <strong>{formatCurrency(totalDue)}</strong>
            </div>

            {/* NEW: Fee Summary */}
            {totalFees > 0 && (
              <>
                <div className="pt-3 border-t border-primary/30">
                  <div className="flex justify-between text-sm text-secondary mb-2">
                    <span>Separate Fees (Paid Independently):</span>
                  </div>
                  {registrationFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Registration Fee:</span>
                      <strong className="text-purple-600">{formatCurrency(registrationFee)}</strong>
                    </div>
                  )}
                  {adminFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Admin Fee:</span>
                      <strong className="text-purple-600">{formatCurrency(adminFee)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-purple-600 mt-2 pt-2 border-t border-purple-300">
                    <span>Total Fees:</span>
                    <strong>{formatCurrency(totalFees)}</strong>
                  </div>
                </div>
              </>
            )}
            
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