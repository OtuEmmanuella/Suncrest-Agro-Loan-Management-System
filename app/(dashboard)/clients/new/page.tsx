// app/(dashboard)/clients/new/page.tsx
import React from 'react';
import { Header } from '@/components/dashboard/Header';
import { ClientForm } from '@/components/clients/ClientForm';

export default function NewClientPage() {
  return (
    <div>
      <Header 
        title="Register New Client" 
        subtitle="Clients / New"
      />
      
      <div className="max-w-3xl">
        <ClientForm />
      </div>
    </div>
  );
}
