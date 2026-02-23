// components/dashboard/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Clock,
  CreditCard,
  TrendingUp,
  LogOut,
  FileText,
  CheckCircle, // NEW: Icon for completed loans
} from 'lucide-react';
import { toast } from 'sonner';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Loans', href: '/loans', icon: Wallet },
    { name: 'Pending', href: '/loans/pending', icon: Clock },
    { name: 'Completed', href: '/loans/completed', icon: CheckCircle }, // NEW
    { name: 'Repayments', href: '/repayments', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: TrendingUp },
    ...(isAdmin ? [{ name: 'Audit Trail', href: '/audit', icon: FileText }] : []),
  ];

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

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className="w-64 bg-primary min-h-screen p-4 sm:p-6 text-cream flex flex-col">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 text-lg sm:text-2xl font-bold">
          <span>💰</span>
          <span className="truncate">Suncrest Agro</span>
        </div>
      </div>

      <nav className="space-y-1 sm:space-y-2 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all text-sm sm:text-base',
                'hover:bg-cream/10',
                isActive && 'bg-lavender text-primary font-semibold'
              )}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all hover:bg-red-500/20 text-red-300 mt-4 w-full text-sm sm:text-base"
      >
        <LogOut size={20} className="flex-shrink-0" />
        <span>Logout</span>
      </button>
    </aside>
  );
}