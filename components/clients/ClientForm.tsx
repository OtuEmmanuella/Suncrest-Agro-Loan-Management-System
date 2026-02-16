// components/clients/ClientForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface ClientFormData {
  name: string;
  phone: string;
  address: string;
  id_card_number: string;
  account_number: string;
  bank_name: string;
  guarantor_name: string;
  guarantor_phone: string;
  guarantor_address: string;
}

const NIGERIAN_BANKS = [
  { value: '', label: 'Select Bank' },
  { value: 'access', label: 'Access Bank' },
  { value: 'gtbank', label: 'GTBank' },
  { value: 'firstbank', label: 'First Bank' },
  { value: 'uba', label: 'UBA' },
  { value: 'zenith', label: 'Zenith Bank' },
  { value: 'fidelity', label: 'Fidelity Bank' },
  { value: 'union', label: 'Union Bank' },
  { value: 'sterling', label: 'Sterling Bank' },
  { value: 'stanbic', label: 'Stanbic IBTC' },
  { value: 'fcmb', label: 'FCMB' },
  { value: 'ecobank', label: 'Ecobank' },
  { value: 'wema', label: 'Wema Bank' },
  { value: 'unity', label: 'Unity Bank' },
];

export function ClientForm() {
  const router = useRouter();
  const [accountName, setAccountName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ClientFormData>();

  const accountNumber = watch('account_number');
  const bankName = watch('bank_name');

  const verifyAccount = async () => {
  if (!accountNumber || !bankName || accountNumber.length !== 10) {
    toast.error('Enter valid 10-digit account number and select bank');
    return;
  }

  setVerifying(true);
  try {
    const response = await fetch('/api/verify-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_name: bankName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error || 'Failed to verify account');
      setAccountName('');
      return;
    }

    setAccountName(data.account_name);
    toast.success('Account verified successfully!');
  } catch (error) {
    console.error('Verification error:', error);
    toast.error('Failed to verify account. Please try again.');
    setAccountName('');
  } finally {
    setVerifying(false);
  }
};

  const onSubmit = async (data: ClientFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('clients')
        .insert([
          {
            full_name: data.name,
            phone_number: data.phone,
            address: data.address,
            id_card: data.id_card_number,
            account_number: data.account_number,
            bank_name: data.bank_name,
            account_name: accountName,
            guarantor_name: data.guarantor_name,
            guarantor_phone: data.guarantor_phone,
            guarantor_address: data.guarantor_address,
            created_by: user.id,
          },
        ]);

      if (error) throw error;

      toast.success('Client registered successfully!');
      router.push('/clients');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to register client');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register('name', { required: 'Name is required' })}
              error={errors.name?.message}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="080-1234-5678"
              {...register('phone', { 
                required: 'Phone number is required',
              })}
              error={errors.phone?.message}
              required
            />
          </div>

          <Input
            label="Address"
            placeholder="123 Main Street, Lagos"
            {...register('address', { required: 'Address is required' })}
            error={errors.address?.message}
            required
          />

          <Input
            label="ID Card Number"
            placeholder="NIN, Driver's License, or Voter's Card"
            {...register('id_card_number', { required: 'ID Card number is required' })}
            error={errors.id_card_number?.message}
            required
          />
        </CardContent>
      </Card>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Bank Name"
              {...register('bank_name', { required: 'Bank is required' })}
              options={NIGERIAN_BANKS}
              error={errors.bank_name?.message}
              required
            />

            <div>
              <Input
                label="Account Number"
                type="text"
                maxLength={10}
                placeholder="0123456789"
                {...register('account_number', { 
                  required: 'Account number is required',
                  minLength: { value: 10, message: 'Must be 10 digits' },
                  maxLength: { value: 10, message: 'Must be 10 digits' },
                })}
                error={errors.account_number?.message}
                required
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={verifyAccount}
                disabled={verifying}
                className="mt-2"
              >
                {verifying ? 'Verifying...' : 'Verify Account'}
              </Button>
            </div>
          </div>

          {accountName && (
            <div className="p-4 bg-lavender rounded-lg">
              <p className="text-sm text-secondary">Account Name:</p>
              <p className="font-semibold text-primary">{accountName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guarantor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Guarantor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Guarantor Full Name"
              placeholder="Jane Doe"
              {...register('guarantor_name', { required: 'Guarantor name is required' })}
              error={errors.guarantor_name?.message}
              required
            />

            <Input
              label="Guarantor Phone"
              type="tel"
              placeholder="080-9876-5432"
              {...register('guarantor_phone', { required: 'Guarantor phone is required' })}
              error={errors.guarantor_phone?.message}
              required
            />
          </div>

          <Input
            label="Guarantor Address"
            placeholder="456 Second Street, Lagos"
            {...register('guarantor_address', { required: 'Guarantor address is required' })}
            error={errors.guarantor_address?.message}
            required
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : 'Register Client'}
        </Button>
      </div>
    </form>
  );
}