// app/(dashboard)/clients/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatPhone, formatDate } from '@/lib/utils/formatting';
import { PaymentAlertsSummary } from '@/components/dashboard/PaymentAlertsSummary';
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
        .order('created_at', { ascending: false});

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
    <div className="max-w-7xl mx-auto">
      <Header 
        title="Clients" 
        action={
          <Link href="/clients/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">+ New Client</Button>
          </Link>
        }
      />
       
     <PaymentAlertsSummary />
       
      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-sage">
                  <th className="text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Name</th>
                  <th className="text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Phone</th>
                  <th className="hidden md:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Address</th>
                  <th className="hidden lg:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">ID Card</th>
                  <th className="hidden sm:table-cell text-left py-2 px-2 sm:px-4 text-xs font-semibold text-primary">Registered</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-secondary text-sm">
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
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-none">
                        {client.full_name}
                      </td>
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{formatPhone(client.phone_number)}</td>
                      <td className="hidden md:table-cell py-2 px-2 sm:px-4 text-xs sm:text-sm truncate max-w-[150px]">
                        {client.address}
                      </td>
                      <td className="hidden lg:table-cell py-2 px-2 sm:px-4 text-xs sm:text-sm">{client.id_card}</td>
                      <td className="hidden sm:table-cell py-2 px-2 sm:px-4 text-xs">{formatDate(client.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}