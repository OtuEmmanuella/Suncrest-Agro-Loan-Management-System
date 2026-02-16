// components/dashboard/Header.tsx
'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { user } = useAuth();

  return (
    <div className="bg-cream-light p-6 rounded-xl border-2 border-sage mb-6">
      <div className="flex items-center justify-between">
        <div>
          {subtitle && (
            <p className="text-sm text-secondary mb-1">{subtitle}</p>
          )}
          <h1 className="text-3xl font-bold text-primary">{title}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {action && <div>{action}</div>}
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-secondary">
                {user?.full_name || 'Loading...'}
              </p>
              <p className="text-xs text-secondary opacity-70 capitalize">
                {user?.role || ''}
              </p>
            </div>
            <div className="w-10 h-10 bg-lavender rounded-full flex items-center justify-center text-primary font-bold">
              {user?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}