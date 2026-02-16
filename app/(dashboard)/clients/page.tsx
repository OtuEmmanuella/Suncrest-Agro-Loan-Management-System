// app/(dashboard)/clients/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatPhone, formatDate } from '@/lib/utils/formatting';
import { PaymentAlerts } from '@/components/dashboard/PaymentAlerts';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  full_name: string;
  phone_number: string;
  address: string;
  id_card: string;
  created_at: string;
}

export default function ClientsPage() {
   const router = useRouter();  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
 

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div>
      <Header 
        title="Clients" 
        action={
          <Link href="/clients/new">
            <Button>+ New Client</Button>
          </Link>
        }
      />
       
       <PaymentAlerts />
       
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Address</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">ID Card</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Registered</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-secondary">
                    No clients found. <Link href="/clients/new" className="text-primary underline">Add your first client</Link>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                    <tr 
                        key={client.id} 
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="border-b border-sage hover:bg-cream transition-colors cursor-pointer"
                        >
                    <td className="py-3 px-4 font-semibold">{client.full_name}</td>
                    <td className="py-3 px-4">{formatPhone(client.phone_number)}</td>
                    <td className="py-3 px-4">{client.address}</td>
                    <td className="py-3 px-4">{client.id_card}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(client.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}