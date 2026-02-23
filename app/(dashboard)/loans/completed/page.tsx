// app/(dashboard)/loans/completed/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle } from 'lucide-react';

interface CompletedLoan {
  id: string;
  loan_amount: number;
  total_due: number;
  total_paid: number;
  interest_rate: number;
  payment_plan: string;
  created_at: string;
  disbursed_date: string;
  completed_date?: string;
  completed_by_name?: string;
  duration_value?: number;
  duration_unit?: string;
  duration_months: number;
  clients?: {
    full_name: string;
    phone_number: string;
  };
}

export default function CompletedLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<CompletedLoan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<CompletedLoan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalAmountDisbursed: 0,
    totalInterestCollected: 0,
  });

  useEffect(() => {
    fetchCompletedLoans();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLoans(loans);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = loans.filter(loan => 
        loan.clients?.full_name.toLowerCase().includes(query)
      );
      setFilteredLoans(filtered);
    }
  }, [searchQuery, loans]);

  const fetchCompletedLoans = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('loans')
        .select('*, clients(full_name, phone_number)')
        .eq('status', 'completed')
        .order('completed_date', { ascending: false });

      if (data) {
        setLoans(data);
        setFilteredLoans(data);

        // Calculate stats
        const totalDisbursed = data.reduce((sum, loan) => sum + Number(loan.loan_amount), 0);
        const totalInterest = data.reduce((sum, loan) => {
          const interest = Number(loan.total_due) - Number(loan.loan_amount);
          return sum + interest;
        }, 0);

        setStats({
          totalCompleted: data.length,
          totalAmountDisbursed: totalDisbursed,
          totalInterestCollected: totalInterest,
        });
      }
    } catch (error) {
      console.error('Error fetching completed loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (loan: CompletedLoan) => {
    if (!loan.disbursed_date || !loan.completed_date) return 'N/A';
    
    const start = new Date(loan.disbursed_date);
    const end = new Date(loan.completed_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(days / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-secondary">Loading completed loans...</div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Completed Loans" 
        subtitle="View all fully repaid loans"
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white rounded-full p-3">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-sm text-green-700">Total Completed</div>
              <div className="text-2xl font-bold text-green-900">{stats.totalCompleted}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white rounded-full p-3">
              <span className="text-xl">₦</span>
            </div>
            <div>
              <div className="text-sm text-blue-700">Amount Disbursed</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(stats.totalAmountDisbursed)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 text-white rounded-full p-3">
              <span className="text-xl">📈</span>
            </div>
            <div>
              <div className="text-sm text-purple-700">Interest Collected</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(stats.totalInterestCollected)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and List */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-primary mb-3">
            Completed Loans ({filteredLoans.length})
          </h3>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-sage rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Loans Table */}
        {filteredLoans.length === 0 ? (
          <p className="text-center text-secondary py-8">
            {searchQuery ? 'No completed loans found matching your search' : 'No completed loans yet'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-lavender">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Loan Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Total Repaid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Interest</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Completed</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage">
                {filteredLoans.map((loan) => {
                  const interest = Number(loan.total_due) - Number(loan.loan_amount);
                  
                  return (
                    <tr key={loan.id} className="hover:bg-cream transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-primary">{loan.clients?.full_name}</div>
                        <div className="text-xs text-secondary">{loan.clients?.phone_number}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(loan.loan_amount)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        {formatCurrency(loan.total_paid)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-purple-600">
                        {formatCurrency(interest)}
                        <div className="text-xs text-secondary">{loan.interest_rate}%</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{calculateDuration(loan)}</div>
                        <div className="text-xs text-secondary capitalize">{loan.payment_plan}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {loan.completed_date ? formatDate(loan.completed_date) : 'N/A'}
                        </div>
                        {loan.completed_by_name && (
                          <div className="text-xs text-secondary">by {loan.completed_by_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/loans/${loan.id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}