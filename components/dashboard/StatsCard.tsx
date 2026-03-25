// components/dashboard/StatsCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatting';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  isCurrency?: boolean;
  info?: string;
}

export function StatsCard({ title, value, icon, isCurrency = false, info }: StatsCardProps) {
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

          <div className="flex items-start gap-2">
            {info && (
              <div className="relative group">
                {/* Info icon */}
                <div className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-[11px] font-semibold flex items-center justify-center cursor-default select-none hover:border-gray-400 hover:text-gray-500 transition-colors">
                  i
                </div>

                {/* Tooltip — shown on hover of the group */}
                <div className="
                  pointer-events-none
                  absolute right-0 top-7
                  w-56
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  p-3
                  text-xs leading-relaxed text-gray-600 dark:text-gray-300
                  shadow-lg
                  z-50
                  opacity-0 invisible translate-y-1
                  group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                  transition-all duration-150
                ">
                  {/* Small arrow pointer */}
                  <div className="absolute -top-1.5 right-1.5 w-3 h-3 rotate-45 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700" />
                  <span className="relative z-10 block">{info}</span>
                </div>
              </div>
            )}

            <div className="text-2xl opacity-60">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}