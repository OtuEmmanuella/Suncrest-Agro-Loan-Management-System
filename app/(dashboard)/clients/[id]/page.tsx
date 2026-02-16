// app/(dashboard)/clients/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils/formatting';
import { User, Phone, MapPin, CreditCard, Building, Shield, ArrowLeft } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  phone_number: string;
  address: string;
  id_card: string;
  account_number?: string;
  bank_name?: string;
  account_name?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_address?: string;
  created_at: string;
}

interface Loan {
  id: string;
  loan_amount: number;
  total_due: number;
  total_paid: number;
  installment_amount: number;
  payment_plan: string;
  status: string;
  disbursed_date?: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  account_type: string;
  created_at: string;
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch all loans for this client
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      setLoans(loansData || []);

      // Fetch all payments for this client's loans
      if (loansData && loansData.length > 0) {
        const loanIds = loansData.map(l => l.id);
        const { data: paymentsData } = await supabase
          .from('repayments')
          .select('*')
          .in('loan_id', loanIds)
          .order('payment_date', { ascending: false });

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-secondary mb-4">Client not found</p>
        <Button onClick={() => router.push('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  const totalLoaned = loans.reduce((sum, loan) => sum + Number(loan.loan_amount), 0);
  const totalRepaid = loans.reduce((sum, loan) => sum + Number(loan.total_paid || 0), 0);
  const totalOutstanding = loans
    .filter(l => l.status === 'disbursed')
    .reduce((sum, loan) => sum + (Number(loan.total_due) - Number(loan.total_paid || 0)), 0);

  return (
    <div>
      <Header 
        title={client.full_name}
        subtitle="Client Details"
        action={
          <Button variant="secondary" onClick={() => router.push('/clients')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Clients
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-600">Total Loaned</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalLoaned)}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-sm text-green-600">Total Repaid</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalRepaid)}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-sm text-yellow-600">Outstanding</div>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="text-sm text-purple-600">Total Loans</div>
            <div className="text-2xl font-bold text-purple-900">{loans.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-secondary flex items-center gap-2">
                  <User size={14} />
                  Full Name
                </div>
                <div className="font-semibold">{client.full_name}</div>
              </div>

              <div>
                <div className="text-sm text-secondary flex items-center gap-2">
                  <Phone size={14} />
                  Phone Number
                </div>
                <div className="font-semibold">{formatPhone(client.phone_number)}</div>
              </div>

              <div>
                <div className="text-sm text-secondary flex items-center gap-2">
                  <MapPin size={14} />
                  Address
                </div>
                <div className="font-semibold">{client.address}</div>
              </div>

              <div>
                <div className="text-sm text-secondary flex items-center gap-2">
                  <CreditCard size={14} />
                  ID Card
                </div>
                <div className="font-semibold">{client.id_card}</div>
              </div>

              <div className="text-xs text-secondary pt-2 border-t border-sage">
                Registered: {formatDate(client.created_at)}
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          {client.account_number && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building size={20} />
                  Bank Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-secondary">Bank Name</div>
                  <div className="font-semibold capitalize">{client.bank_name?.replace(/([a-z])([A-Z])/g, '$1 $2')}</div>
                </div>

                <div>
                  <div className="text-sm text-secondary">Account Number</div>
                  <div className="font-semibold">{client.account_number}</div>
                </div>

                {client.account_name && (
                  <div>
                    <div className="text-sm text-secondary">Account Name</div>
                    <div className="font-semibold">{client.account_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guarantor Information */}
          {client.guarantor_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Guarantor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-secondary">Name</div>
                  <div className="font-semibold">{client.guarantor_name}</div>
                </div>

                <div>
                  <div className="text-sm text-secondary">Phone</div>
                  <div className="font-semibold">{formatPhone(client.guarantor_phone)}</div>
                </div>

                <div>
                  <div className="text-sm text-secondary">Address</div>
                  <div className="font-semibold">{client.guarantor_address}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Loans and Payments History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loans History */}
          <Card>
            <CardHeader>
              <CardTitle>Loan History ({loans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-center text-secondary py-8">No loans yet</p>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => {
                    const balance = Number(loan.total_due) - Number(loan.total_paid || 0);
                    const progress = (Number(loan.total_paid || 0) / Number(loan.total_due)) * 100;

                    return (
                      <div key={loan.id} className="border-2 border-sage rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{formatCurrency(loan.loan_amount)}</div>
                            <div className="text-sm text-secondary">
                              {formatDate(loan.created_at)} • {loan.payment_plan}
                            </div>
                          </div>
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

                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <div className="text-secondary">Total Due</div>
                            <div className="font-semibold">{formatCurrency(loan.total_due)}</div>
                          </div>
                          <div>
                            <div className="text-secondary">Paid</div>
                            <div className="font-semibold text-green-600">{formatCurrency(loan.total_paid || 0)}</div>
                          </div>
                          <div>
                            <div className="text-secondary">Balance</div>
                            <div className="font-semibold text-red-600">{formatCurrency(balance)}</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="bg-sage rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          {progress.toFixed(0)}% repaid
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-secondary py-8">No payments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-sage">
                        <th className="text-left py-2 px-3 text-sm font-semibold text-primary">Date</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-primary">Amount</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-primary">Method</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-primary">Recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-sage">
                          <td className="py-2 px-3 text-sm">{formatDate(payment.payment_date)}</td>
                          <td className="py-2 px-3 font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="py-2 px-3 text-sm">{payment.account_type}</td>
                          <td className="py-2 px-3 text-xs text-secondary">
                            {formatDate(payment.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}