// components/dashboard/StatsCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatting';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  isCurrency?: boolean;
}

export function StatsCard({ title, value, icon, isCurrency = false }: StatsCardProps) {
  const displayValue = isCurrency && typeof value === 'number' 
    ? formatCurrency(value) 
    : value;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-secondary mb-2">{title}</p>
          <p className="text-3xl font-bold text-primary">{displayValue}</p>
        </div>
        <div className="w-12 h-12 bg-lavender rounded-lg flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </Card>
  );
}
