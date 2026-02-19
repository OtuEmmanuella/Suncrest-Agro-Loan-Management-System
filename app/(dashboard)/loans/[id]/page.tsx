// app/(dashboard)/loans/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { ArrowLeft, TrendingUp, DollarSign, Calendar, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { EditInterestModal } from '@/components/loans/EditInterestModal';
import { Edit } from 'lucide-react';

interface Loan {
  id: string;
  loan_amount: number;
  interest_rate: number;
  total_due: number;
  total_paid: number;
  installment_amount: number;
  payment_plan: string;
  duration_months: number;
   duration_value?: number;   
  duration_unit?: string; 
  status: string;
  disbursed_date?: string;
  repayment_start_date?: string;
  next_payment_date?: string;
  created_at: string;
  created_by_name?: string;        
  disbursed_by_name?: string;      
  clients?: {
    full_name: string;
    phone_number: string;
  };

}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  account_type: string;
  created_at: string;
  recorded_by_name?: string;       // NEW: Who recorded the payment
}

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAdmin } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails();
    }
  }, [loanId]);

  const fetchLoanDetails = async () => {
    try {
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*, clients(full_name, phone_number)')
        .eq('id', loanId)
        .single();

      if (loanError) throw loanError;
      setLoan(loanData);

      const { data: paymentsData } = await supabase
        .from('repayments')
        .select('*')
        .eq('loan_id', loanId)
        .order('payment_date', { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching loan details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-secondary mb-4">Loan not found</p>
        <Button onClick={() => router.push('/loans')}>Back to Loans</Button>
      </div>
    );
  }

  const balance = Number(loan.total_due) - Number(loan.total_paid || 0);
  const progress = (Number(loan.total_paid || 0) / Number(loan.total_due)) * 100;
  
  // Calculate remaining payments based on installment amount
  const paymentsRemaining = Math.ceil(balance / loan.installment_amount);
  
  // For calculating payment count with flexible duration:
const getOriginalPaymentCount = () => {
  // If new duration fields exist, use them
  if (loan.duration_value && loan.duration_unit) {
    const totalDays = loan.duration_unit === 'days' ? loan.duration_value :
                      loan.duration_unit === 'weeks' ? loan.duration_value * 7 :
                      loan.duration_value * 30; // months
    
    switch (loan.payment_plan) {
      case 'daily': return totalDays;
      case 'weekly': return Math.ceil(totalDays / 7);
      case 'monthly': return Math.ceil(totalDays / 30);
      default: return Math.ceil(totalDays / 30);
    }
  }
  
  // Fallback for old loans (backward compatibility)
  const duration = loan.duration_months;
  switch (loan.payment_plan) {
    case 'daily': return duration * 30;
    case 'weekly': return Math.ceil(duration * 4.33);
    case 'monthly': return duration;
    default: return duration;
  }
};
  
  const originalPaymentCount = getOriginalPaymentCount();
  const paymentsMade = payments.length;
  
  // Calculate if ahead or behind schedule
  const paymentDifference = originalPaymentCount - (paymentsMade + paymentsRemaining);
  const isAheadOfSchedule = paymentDifference > 0;
  
  // Calculate time saved/remaining
  const calculateTimeSaved = () => {
    if (paymentDifference <= 0) return null;
    
    switch (loan.payment_plan) {
      case 'daily':
        return `${paymentDifference} day${paymentDifference !== 1 ? 's' : ''}`;
      case 'weekly':
        const weeks = Math.floor(paymentDifference);
        return `${weeks} week${weeks !== 1 ? 's' : ''}`;
      case 'monthly':
        return `${paymentDifference} month${paymentDifference !== 1 ? 's' : ''}`;
      default:
        return `${paymentDifference} payment${paymentDifference !== 1 ? 's' : ''}`;
    }
  };

  const timeSaved = calculateTimeSaved();
  
  // Calculate average payment
  const totalPaid = Number(loan.total_paid || 0);
  const averagePayment = paymentsMade > 0 ? totalPaid / paymentsMade : 0;
  const isPayingAboveInstallment = averagePayment > loan.installment_amount;

  // Interest calculation
  const interestAmount = Number(loan.total_due) - Number(loan.loan_amount);

  return (
    <div>
      <Header 
        title={`Loan - ${loan.clients?.full_name}`}
        subtitle="Loan Details"
        action={
          <Button variant="secondary" onClick={() => router.push('/loans')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Loans
          </Button>
        }
      />

      {/* ============================================ */}
      {/* NEW: USER TRACKING INFO */}
      {/* ============================================ */}
      {(loan.created_by_name || loan.disbursed_by_name) && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {loan.created_by_name && (
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-600" />
                  <span className="text-secondary">Created by:</span>
                  <span className="font-semibold text-blue-900">{loan.created_by_name}</span>
                  <span className="text-xs text-secondary">on {formatDate(loan.created_at)}</span>
                </div>
              )}
              {loan.disbursed_by_name && loan.disbursed_date && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  <span className="text-secondary">Disbursed by:</span>
                  <span className="font-semibold text-blue-900">{loan.disbursed_by_name}</span>
                  <span className="text-xs text-secondary">on {formatDate(loan.disbursed_date)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <DollarSign size={16} />
              <span className="text-sm">Principal Amount</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(loan.loan_amount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <TrendingUp size={16} />
              <span className="text-sm">Total Due</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{formatCurrency(loan.total_due)}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle size={16} />
              <span className="text-sm">Total Paid</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(loan.total_paid || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Calendar size={16} />
              <span className="text-sm">Balance</span>
            </div>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(balance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overpayment Alert */}
      {isAheadOfSchedule && timeSaved && (
        <Card className="mb-6 bg-green-50 border-2 border-green-400">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-500 text-white rounded-full p-2">
                <Clock size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900 mb-2">🎉 Ahead of Schedule!</h3>
                <p className="text-green-800 mb-2">
                  By paying more than the minimum installment, this loan will be completed <strong>{timeSaved}</strong> earlier than planned!
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-green-600">Original Schedule</div>
                    <div className="font-bold text-green-900">{originalPaymentCount} payments</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-green-600">Payments Made</div>
                    <div className="font-bold text-green-900">{paymentsMade}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-green-600">Remaining</div>
                    <div className="font-bold text-green-900">{paymentsRemaining}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-green-600">Avg. Payment</div>
                    <div className="font-bold text-green-900">{formatCurrency(averagePayment)}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Repayment Progress</span>
            <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <div className="bg-sage rounded-full h-4">
            <div 
              className="bg-primary h-4 rounded-full transition-all flex items-center justify-end px-2"
              style={{ width: `${progress}%` }}
            >
              {progress > 10 && (
                <span className="text-xs text-cream font-semibold">
                  {progress.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-secondary mt-2">
            <span>{formatCurrency(loan.total_paid || 0)} paid</span>
            <span>{formatCurrency(balance)} remaining</span>
          </div>
          
          {/* Payment Schedule Info */}
          <div className="mt-4 pt-4 border-t border-sage">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-secondary">Expected Installment</div>
                <div className="font-semibold">{formatCurrency(loan.installment_amount)}</div>
              </div>
              <div>
                <div className="text-secondary">Average Payment</div>
                <div className={`font-semibold ${isPayingAboveInstallment ? 'text-green-600' : ''}`}>
                  {formatCurrency(averagePayment)}
                  {isPayingAboveInstallment && ' ↑'}
                </div>
              </div>
              <div>
                <div className="text-secondary">Payments Made</div>
                <div className="font-semibold">{paymentsMade} of {originalPaymentCount}</div>
              </div>
              <div>
                <div className="text-secondary">Remaining Payments</div>
                <div className="font-semibold">{paymentsRemaining}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Information */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-secondary">Client Name</div>
                <div className="font-semibold">{loan.clients?.full_name}</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Phone Number</div>
                <div className="font-semibold">{loan.clients?.phone_number}</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Interest Rate</div>
                <div className="font-semibold">{loan.interest_rate}%</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Interest Amount</div>
                <div className="font-semibold text-purple-600">{formatCurrency(interestAmount)}</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Payment Plan</div>
                <div className="font-semibold capitalize">{loan.payment_plan}</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Loan Duration</div>
                <div className="font-semibold">
                  {loan.duration_value && loan.duration_unit 
                    ? `${loan.duration_value} ${loan.duration_unit}`
                    : `${loan.duration_months} months` /* fallback for old loans */
                  }
                </div>
              </div>

              <div>
                <div className="text-sm text-secondary">Expected Installment</div>
                <div className="font-semibold">{formatCurrency(loan.installment_amount)}</div>
              </div>

              <div>
                <div className="text-sm text-secondary">Status</div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    loan.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : loan.status === 'disbursed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {loan.status}
                </span>
              </div>

              <div>
                <div className="text-sm text-secondary">
                  {isAheadOfSchedule ? 'New Timeline' : 'Payments Remaining'}
                </div>
                <div className={`font-semibold ${isAheadOfSchedule ? 'text-green-600' : ''}`}>
                  {paymentsRemaining}
                  {isAheadOfSchedule && timeSaved && (
                    <span className="text-xs ml-1">(-{timeSaved})</span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && loan.status !== 'completed' && (
              <div className="pt-4 border-t border-sage">
                <Button
                  variant="secondary"
                  onClick={() => setShowEditModal(true)}
                  className="w-full"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Interest Rate (Admin)
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-sage space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-secondary">Created Date</div>
                  <div className="font-semibold">{formatDate(loan.created_at)}</div>
                </div>

                {loan.disbursed_date && (
                  <div>
                    <div className="text-sm text-secondary">Disbursed Date</div>
                    <div className="font-semibold">{formatDate(loan.disbursed_date)}</div>
                  </div>
                )}

                {loan.repayment_start_date && (
                  <div>
                    <div className="text-sm text-secondary">Repayment Started</div>
                    <div className="font-semibold">{formatDate(loan.repayment_start_date)}</div>
                  </div>
                )}

                {loan.next_payment_date && loan.status === 'disbursed' && (
                  <div>
                    <div className="text-sm text-secondary">Next Payment Due</div>
                    <div className="font-semibold text-red-600">{formatDate(loan.next_payment_date)}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {showEditModal && (
            <EditInterestModal
              loan={{
                id: loan.id,
                loan_amount: loan.loan_amount,
                interest_rate: loan.interest_rate,
                total_due: loan.total_due,
                total_paid: loan.total_paid || 0,
                payment_plan: loan.payment_plan,
                duration_months: loan.duration_months,
                client_name: loan.clients?.full_name || '',
              }}
              onClose={() => setShowEditModal(false)}
              onUpdate={() => {
                fetchLoanDetails();
              }}
            />
          )}
        </Card>

        {/* ============================================ */}
        {/* Payment History - NOW SHOWS WHO RECORDED IT */}
        {/* ============================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-secondary py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {payments.map((payment, index) => {
                  const isOverpayment = Number(payment.amount) > loan.installment_amount;
                  const overpaymentAmount = Number(payment.amount) - loan.installment_amount;
                  
                  return (
                    <div key={payment.id} className={`p-3 rounded-lg border ${
                      isOverpayment ? 'bg-green-50 border-green-300' : 'bg-cream border-sage'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`font-semibold ${isOverpayment ? 'text-green-700' : 'text-green-600'}`}>
                            {formatCurrency(payment.amount)}
                            {isOverpayment && (
                              <span className="text-xs ml-2 bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                +{formatCurrency(overpaymentAmount)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-secondary">
                            Payment #{payments.length - index}
                            {isOverpayment && (
                              <span className="text-green-600 ml-2">• Overpaid</span>
                            )}
                          </div>
                          {/* NEW: Show who recorded the payment */}
                          {payment.recorded_by_name && (
                            <div className="text-xs text-blue-600 mt-1">
                              Recorded by: <span className="font-semibold">{payment.recorded_by_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatDate(payment.payment_date)}
                          </div>
                          <div className="text-xs text-secondary">
                            via {payment.account_type}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-sage">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Payments:</span>
                    <span className="font-semibold">{payments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Amount:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Average per Payment:</span>
                    <span className={`font-semibold ${isPayingAboveInstallment ? 'text-green-600' : ''}`}>
                      {formatCurrency(averagePayment)}
                    </span>
                  </div>
                  {isPayingAboveInstallment && (
                    <div className="pt-2 border-t border-sage">
                      <div className="text-xs text-green-600 font-semibold">
                        ⚡ Paying {formatCurrency(averagePayment - loan.installment_amount)} above minimum on average
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action */}
      {loan.status === 'disbursed' && balance > 0 && (
        <div className="mt-6">
          <Button 
            onClick={() => router.push(`/repayments?loan=${loanId}`)}
            className="w-full"
          >
            Record Payment
          </Button>
        </div>
      )}
    </div>
  );
}