// app/(dashboard)/clients/[id]/edit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-client';

const NIGERIAN_BANKS = [
  { value: '', label: 'Select Bank' },
  { value: 'access', label: 'Access Bank' },
  { value: 'gtbank', label: 'GTBank (Guaranty Trust Bank)' },
  { value: 'firstbank', label: 'First Bank of Nigeria' },
  { value: 'uba', label: 'UBA (United Bank for Africa)' },
  { value: 'zenith', label: 'Zenith Bank' },
  { value: 'fidelity', label: 'Fidelity Bank' },
  { value: 'union', label: 'Union Bank' },
  { value: 'sterling', label: 'Sterling Bank' },
  { value: 'stanbic', label: 'Stanbic IBTC Bank' },
  { value: 'fcmb', label: 'FCMB (First City Monument Bank)' },
  { value: 'ecobank', label: 'Ecobank Nigeria' },
  { value: 'wema', label: 'Wema Bank' },
  { value: 'unity', label: 'Unity Bank' },
  { value: 'keystone', label: 'Keystone Bank' },
  { value: 'polaris', label: 'Polaris Bank' },
  { value: 'providus', label: 'Providus Bank' },
  { value: 'heritage', label: 'Heritage Bank' },
  { value: 'jaiz', label: 'Jaiz Bank' },
  { value: 'suntrust', label: 'SunTrust Bank' },
  { value: 'titan', label: 'Titan Trust Bank' },
  { value: 'globus', label: 'Globus Bank' },
  { value: 'parallex', label: 'Parallex Bank' },
  { value: 'premium-trust', label: 'Premium Trust Bank' },
  { value: 'taj', label: 'TAJ Bank' },
  { value: 'lotus', label: 'Lotus Bank' },
  { value: 'kuda', label: 'Kuda Bank' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint MFB' },
  { value: 'carbon', label: 'Carbon' },
  { value: 'vfd', label: 'VFD Microfinance Bank' },
  { value: 'rubies', label: 'Rubies Bank' },
  { value: 'sparkle', label: 'Sparkle Microfinance Bank' },
];

interface ClientData {
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
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [client, setClient] = useState<ClientData | null>(null);
  const [originalClient, setOriginalClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClient(data);
      setOriginalClient(data); // Store original for comparison
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !originalClient) return;

    setSaving(true);
    try {
      // ============================================
      // GET USER INFO FOR TRACKING
      // ============================================
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      const userName = profileData?.full_name || 'Unknown User';
      const userRole = profileData?.role || 'manager';

      // ============================================
      // DETECT CHANGES
      // ============================================
      const changes: { field: string; old: any; new: any }[] = [];
      const fields = [
        'full_name', 'phone_number', 'address', 'id_card',
        'account_number', 'bank_name', 'account_name',
        'guarantor_name', 'guarantor_phone', 'guarantor_address'
      ];

      fields.forEach(field => {
        if (client[field as keyof ClientData] !== originalClient[field as keyof ClientData]) {
          changes.push({
            field,
            old: originalClient[field as keyof ClientData] || 'N/A',
            new: client[field as keyof ClientData] || 'N/A',
          });
        }
      });

      // ============================================
      // UPDATE CLIENT WITH USER TRACKING
      // ============================================
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: client.full_name,
          phone_number: client.phone_number,
          address: client.address,
          id_card: client.id_card,
          account_number: client.account_number,
          bank_name: client.bank_name,
          account_name: client.account_name,
          guarantor_name: client.guarantor_name,
          guarantor_phone: client.guarantor_phone,
          guarantor_address: client.guarantor_address,
          last_modified_by: user?.id,
          last_modified_by_name: userName,
          last_modified_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (error) throw error;

      // ============================================
      // AUDIT TRAIL: Log each field change
      // ============================================
      if (changes.length > 0) {
        await supabase.from('audit_logs').insert([{
          user_id: user?.id,
          user_name: userName,
          user_role: userRole,
          action: 'UPDATE_CLIENT',
          table_name: 'clients',
          record_id: clientId,
          old_data: {
            client_name: originalClient.full_name,
            changes: changes.map(c => ({ field: c.field, old_value: c.old }))
          },
          new_data: {
            client_name: client.full_name,
            changes: changes.map(c => ({ field: c.field, new_value: c.new }))
          },
        }]);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.client(clientId) });

      toast.success('Client updated successfully!');
      router.push(`/clients/${clientId}`);
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error(error.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-secondary">Admin access required</p>
      </div>
    );
  }

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

  return (
    <div className="max-w-4xl mx-auto">
      <Header 
        title="Edit Client"
        subtitle={client.full_name}
        action={
          <Button variant="secondary" onClick={() => router.push(`/clients/${clientId}`)}>
            <ArrowLeft size={16} className="mr-2" />
            Cancel
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Full Name"
                value={client.full_name}
                onChange={(e) => setClient({ ...client, full_name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={client.phone_number}
                onChange={(e) => setClient({ ...client, phone_number: e.target.value })}
                required
              />
            </div>

            <Input
              label="Address"
              value={client.address}
              onChange={(e) => setClient({ ...client, address: e.target.value })}
              required
            />

            <Input
              label="ID Card Number"
              value={client.id_card}
              onChange={(e) => setClient({ ...client, id_card: e.target.value })}
              required
            />
          </CardContent>
        </Card>

        {/* Bank Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Select
                label="Bank Name"
                value={client.bank_name || ''}
                onChange={(e) => setClient({ ...client, bank_name: e.target.value })}
                options={NIGERIAN_BANKS}
              />
              <Input
                label="Account Number"
                type="text"
                maxLength={10}
                value={client.account_number || ''}
                onChange={(e) => setClient({ ...client, account_number: e.target.value })}
              />
            </div>

            <Input
              label="Account Name"
              value={client.account_name || ''}
              onChange={(e) => setClient({ ...client, account_name: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Guarantor Information */}
        <Card>
          <CardHeader>
            <CardTitle>Guarantor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Guarantor Full Name"
                value={client.guarantor_name || ''}
                onChange={(e) => setClient({ ...client, guarantor_name: e.target.value })}
              />
              <Input
                label="Guarantor Phone"
                type="tel"
                value={client.guarantor_phone || ''}
                onChange={(e) => setClient({ ...client, guarantor_phone: e.target.value })}
              />
            </div>

            <Input
              label="Guarantor Address"
              value={client.guarantor_address || ''}
              onChange={(e) => setClient({ ...client, guarantor_address: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/clients/${clientId}`)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}