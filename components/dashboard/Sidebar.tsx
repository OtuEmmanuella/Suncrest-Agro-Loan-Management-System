// components/dashboard/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Clock,
  CreditCard,
  TrendingUp,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Loans', href: '/loans', icon: Wallet },
  { name: 'Pending', href: '/loans/pending', icon: Clock },
  { name: 'Repayments', href: '/repayments', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  return (
    <aside className="w-64 bg-primary min-h-screen p-6 text-cream">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span>💰</span>
          <span>Loan Manager</span>
        </div>
      </div>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                'hover:bg-cream/10',
                isActive && 'bg-lavender text-primary font-semibold'
              )}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-red-500/20 text-red-300 mt-8 w-full"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}