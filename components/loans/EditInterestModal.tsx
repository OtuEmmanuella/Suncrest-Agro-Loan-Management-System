// components/loans/EditInterestModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/formatting';
import { X } from 'lucide-react';

interface EditInterestModalProps {
  loan: {
    id: string;
    loan_amount: number;
    interest_rate: number;
    total_due: number;
    total_paid: number;
    payment_plan: string;
    duration_months: number;
    client_name: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function EditInterestModal({ loan, onClose, onUpdate }: EditInterestModalProps) {
  const [newInterestRate, setNewInterestRate] = useState(loan.interest_rate.toString());
  const [loading, setLoading] = useState(false);

  // Calculate new totals
  const calculateNewTotals = () => {
    const rate = Number(newInterestRate);
    const principal = loan.loan_amount;
    const interest = (principal * rate) / 100;
    const newTotal = principal + interest;

    // Calculate number of payments
    let payments = 0;
    switch (loan.payment_plan) {
      case 'daily':
        payments = loan.duration_months * 30;
        break;
      case 'weekly':
        payments = Math.ceil(loan.duration_months * 4.33);
        break;
      case 'monthly':
        payments = loan.duration_months;
        break;
    }

    const installment = newTotal / payments;

    return {
      newTotal,
      interest,
      installment,
      payments,
    };
  };

  const newTotals = calculateNewTotals();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Get user profile for audit log
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast.error('Only admins can edit interest rates');
        return;
      }

      // Log the old data
      const oldData = {
        interest_rate: loan.interest_rate,
        total_due: loan.total_due,
      };

      // Update loan
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          interest_rate: Number(newInterestRate),
          total_due: newTotals.newTotal,
          installment_amount: newTotals.installment,
          last_modified_by: user.id,
        })
        .eq('id', loan.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        user_name: profile.full_name,
        user_role: profile.role,
        action: 'UPDATE_INTEREST_RATE',
        table_name: 'loans',
        record_id: loan.id,
        old_data: oldData,
        new_data: {
          interest_rate: Number(newInterestRate),
          total_due: newTotals.newTotal,
        },
      }]);

      toast.success('Interest rate updated successfully!');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating interest:', error);
      toast.error(error.message || 'Failed to update interest rate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">Edit Interest Rate</h2>
              <p className="text-sm text-secondary mt-1">Client: {loan.client_name}</p>
            </div>
            <button onClick={onClose} className="text-secondary hover:text-primary">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Current Values */}
            <div className="bg-cream p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Current Values</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Principal:</span>
                  <div className="font-semibold">{formatCurrency(loan.loan_amount)}</div>
                </div>
                <div>
                  <span className="text-secondary">Interest Rate:</span>
                  <div className="font-semibold">{loan.interest_rate}%</div>
                </div>
                <div>
                  <span className="text-secondary">Total Due:</span>
                  <div className="font-semibold">{formatCurrency(loan.total_due)}</div>
                </div>
                <div>
                  <span className="text-secondary">Already Paid:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(loan.total_paid)}</div>
                </div>
              </div>
            </div>

            {/* New Interest Rate Input */}
            <Input
              label="New Interest Rate (%)"
              type="number"
              step="0.1"
              min="0"
              value={newInterestRate}
              onChange={(e) => setNewInterestRate(e.target.value)}
              placeholder="Enter new rate"
            />

            {/* New Calculated Values */}
            <div className="bg-lavender p-4 rounded-lg">
              <h3 className="font-semibold mb-3">New Calculated Values</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>New Interest ({newInterestRate}%):</span>
                  <strong>{formatCurrency(newTotals.interest)}</strong>
                </div>
                <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t-2 border-primary">
                  <span>New Total Due:</span>
                  <strong>{formatCurrency(newTotals.newTotal)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-primary/30">
                  <span>Installment ({loan.payment_plan}):</span>
                  <strong>{formatCurrency(newTotals.installment)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Number of Payments:</span>
                  <strong>{newTotals.payments}</strong>
                </div>
              </div>
            </div>

            {/* Impact Warning */}
            {loan.total_paid > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Warning:</strong> This loan has already received payments. 
                  The new balance will be: <strong>{formatCurrency(newTotals.newTotal - loan.total_paid)}</strong>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}