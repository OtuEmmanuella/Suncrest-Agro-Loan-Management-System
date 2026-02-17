// app/(dashboard)/audit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils/formatting';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuditLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  table_name: string;
  old_data: any;
  new_data: any;
  created_at: string;
  client_name?: string | null;
}

interface LoanWithClient {
  clients?: {
    full_name: string;
  } | Array<{ full_name: string }> | null;
}

export default function AuditPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      
      // Enrich with client names for loan-related actions
      const enrichedLogs = await Promise.all((data || []).map(async (log) => {
        if (log.table_name === 'loans' && log.record_id) {
          const { data: loan } = await supabase
            .from('loans')
            .select('clients(full_name)')
            .eq('id', log.record_id)
            .single();
          
          // Type-safe client name extraction
          let clientName: string | null = null;
          
          if (loan) {
            const loanData = loan as LoanWithClient;
            const clients = loanData.clients;
            
            if (clients) {
              if (Array.isArray(clients)) {
                clientName = clients[0]?.full_name || null;
              } else {
                clientName = clients.full_name || null;
              }
            }
          }
          
          return {
            ...log,
            client_name: clientName,
          };
        }
        return { ...log, client_name: null };
      }));
      
      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
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

  return (
    <div>
      <Header title="Audit Trail" subtitle="System Activity Log" />

      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={fetchLogs} disabled={loading} className="w-full">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-sage">
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Date & Time</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">User</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Role</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Action</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Table</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Changes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-secondary">
                    {startDate || endDate ? 'No audit logs found for selected dates' : 'No audit logs found'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  // Calculate interest amounts for UPDATE_INTEREST_RATE
                  const oldInterest = log.old_data && log.old_data.total_due && log.old_data.interest_rate
                    ? (Number(log.old_data.total_due) / (1 + Number(log.old_data.interest_rate) / 100)) * (Number(log.old_data.interest_rate) / 100)
                    : null;
                  
                  const newInterest = log.new_data && log.new_data.total_due && log.new_data.interest_rate
                    ? (Number(log.new_data.total_due) / (1 + Number(log.new_data.interest_rate) / 100)) * (Number(log.new_data.interest_rate) / 100)
                    : null;

                  return (
                    <tr key={log.id} className="border-b border-sage hover:bg-cream">
                      <td className="py-2 px-3 text-xs">{formatDate(log.created_at)}</td>
                      <td className="py-2 px-3 text-sm font-semibold">{log.user_name}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-lavender rounded text-xs capitalize">
                          {log.user_role}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {log.action.replace(/_/g, ' ')}
                        {log.client_name && (
                          <span className="text-xs text-secondary ml-2">
                            ({log.client_name})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs capitalize">{log.table_name}</td>
                      <td className="py-2 px-3 text-xs">
                        {log.action === 'UPDATE_INTEREST_RATE' && log.old_data && log.new_data ? (
                          <div className="space-y-1">
                            <div className="text-red-600">
                              <div>Old: {log.old_data.interest_rate}%</div>
                              <div>Interest: {oldInterest ? formatCurrency(oldInterest) : 'N/A'}</div>
                              <div>Total: {formatCurrency(log.old_data.total_due)}</div>
                            </div>
                            <div className="text-green-600">
                              <div>New: {log.new_data.interest_rate}%</div>
                              <div>Interest: {newInterest ? formatCurrency(newInterest) : 'N/A'}</div>
                              <div>Total: {formatCurrency(log.new_data.total_due)}</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {log.old_data && (
                              <div className="text-red-600">
                                Old: {JSON.stringify(log.old_data).slice(0, 30)}...
                              </div>
                            )}
                            {log.new_data && (
                              <div className="text-green-600">
                                New: {JSON.stringify(log.new_data).slice(0, 30)}...
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}