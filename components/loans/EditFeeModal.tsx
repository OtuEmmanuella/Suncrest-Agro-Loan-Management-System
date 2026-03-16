// components/loans/EditFeeModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/formatting';
import { X } from 'lucide-react';

interface EditFeeModalProps {
  loan: {
    id: string;
    loan_amount: number;
    registration_fee: number;
    admin_fee: number;
    registration_fee_paid: number;
    admin_fee_paid: number;
    client_name: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function EditFeeModal({ loan, onClose, onUpdate }: EditFeeModalProps) {
  const [newRegistrationFee, setNewRegistrationFee] = useState(loan.registration_fee.toString());
  const [newAdminFee, setNewAdminFee] = useState(loan.admin_fee.toString());
  const [loading, setLoading] = useState(false);

  const calculateNewTotals = () => {
    const regFee = Number(newRegistrationFee);
    const admFee = Number(newAdminFee);
    const totalFees = regFee + admFee;
    const regFeePaid = loan.registration_fee_paid;
    const admFeePaid = loan.admin_fee_paid;
    const totalPaid = regFeePaid + admFeePaid;
    const balance = Math.max(0, totalFees - totalPaid);

    return {
      totalFees,
      regFee,
      admFee,
      balance,
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

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast.error('Only admins can edit fees');
        return;
      }

      const oldData = {
        registration_fee: loan.registration_fee,
        admin_fee: loan.admin_fee,
        total_fees: loan.registration_fee + loan.admin_fee,
      };

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          registration_fee: Number(newRegistrationFee),
          admin_fee: Number(newAdminFee),
        })
        .eq('id', loan.id);

      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        user_name: profile.full_name,
        user_role: profile.role,
        action: 'UPDATE_FEES',
        table_name: 'loans',
        record_id: loan.id,
        old_data: oldData,
        new_data: {
          registration_fee: Number(newRegistrationFee),
          admin_fee: Number(newAdminFee),
          total_fees: newTotals.totalFees,
        },
      }]);

      toast.success('Fees updated successfully!');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating fees:', error);
      toast.error(error.message || 'Failed to update fees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">Edit Fees</h2>
              <p className="text-xs sm:text-sm text-secondary mt-1">Client: {loan.client_name}</p>
            </div>
            <button onClick={onClose} className="text-secondary hover:text-primary">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Current Values */}
            <div className="bg-cream p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Current Fees</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-secondary">Registration Fee:</span>
                  <div className="font-semibold">{formatCurrency(loan.registration_fee)}</div>
                </div>
                <div>
                  <span className="text-secondary">Admin Fee:</span>
                  <div className="font-semibold">{formatCurrency(loan.admin_fee)}</div>
                </div>
                <div>
                  <span className="text-secondary">Reg. Fee Paid:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(loan.registration_fee_paid)}</div>
                </div>
                <div>
                  <span className="text-secondary">Admin Fee Paid:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(loan.admin_fee_paid)}</div>
                </div>
              </div>
            </div>

            {/* New Fee Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Registration Fee (₦)"
                type="number"
                step="0.01"
                min="0"
                value={newRegistrationFee}
                onChange={(e) => setNewRegistrationFee(e.target.value)}
                placeholder="Enter new registration fee"
              />

              <Input
                label="New Admin Fee (₦)"
                type="number"
                step="0.01"
                min="0"
                value={newAdminFee}
                onChange={(e) => setNewAdminFee(e.target.value)}
                placeholder="Enter new admin fee"
              />
            </div>

            {/* New Calculated Values */}
            <div className="bg-lavender p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">New Fee Summary</h3>
              <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span>New Registration Fee:</span>
                  <strong>{formatCurrency(newTotals.regFee)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>New Admin Fee:</span>
                  <strong>{formatCurrency(newTotals.admFee)}</strong>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-bold text-primary pt-3 border-t-2 border-primary">
                  <span>Total Fees:</span>
                  <strong>{formatCurrency(newTotals.totalFees)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-primary/30">
                  <span>Already Paid:</span>
                  <strong className="text-green-600">
                    {formatCurrency(loan.registration_fee_paid + loan.admin_fee_paid)}
                  </strong>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-bold text-red-600">
                  <span>Fee Balance:</span>
                  <strong>{formatCurrency(newTotals.balance)}</strong>
                </div>
              </div>
            </div>

            {/* Impact Warning */}
            {(loan.registration_fee_paid > 0 || loan.admin_fee_paid > 0) && (
              <div className="bg-yellow-50 border-2 border-yellow-400 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-800">
                  ⚠️ <strong>Warning:</strong> Fees have already been partially or fully paid. 
                  Changing fees will affect the outstanding balance.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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