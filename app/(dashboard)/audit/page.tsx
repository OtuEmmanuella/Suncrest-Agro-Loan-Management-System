// app/(dashboard)/audit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatting';
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
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
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
              <Button onClick={fetchLogs} className="w-full">
                Search
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Date & Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Table</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Changes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-secondary">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-sage hover:bg-cream">
                    <td className="py-3 px-4 text-sm">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 font-semibold">{log.user_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-lavender rounded text-xs capitalize">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{log.action.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-sm capitalize">{log.table_name}</td>
                    <td className="py-3 px-4 text-xs">
                      {log.old_data && (
                        <div className="text-red-600">
                          Old: {JSON.stringify(log.old_data).slice(0, 50)}...
                        </div>
                      )}
                      {log.new_data && (
                        <div className="text-green-600">
                          New: {JSON.stringify(log.new_data).slice(0, 50)}...
                        </div>
                      )}
                    </td>
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