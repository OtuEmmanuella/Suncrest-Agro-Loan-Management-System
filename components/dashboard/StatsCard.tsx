// components/dashboard/StatsCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatting';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  isCurrency?: boolean;
}

export function StatsCard({ title, value, icon, isCurrency = false }: StatsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-secondary mb-1">{title}</p>
            <p className="text-xl font-bold text-primary">
              {isCurrency ? formatCurrency(value) : value}
            </p>
          </div>
          <div className="text-2xl opacity-60">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}