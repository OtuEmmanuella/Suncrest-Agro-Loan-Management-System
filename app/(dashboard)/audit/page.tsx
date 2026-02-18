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
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  client_name?: string | null;
  loan_info?: {
    client_name: string;
    loan_amount: number;
    payment_plan: string;
    installment_amount: number;
  } | null;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  phone_number: 'Phone Number',
  address: 'Address',
  id_card: 'ID Card Number',
  bank_name: 'Bank Name',
  account_number: 'Account Number',
  account_name: 'Account Name',
  guarantor_name: 'Guarantor Name',
  guarantor_phone: 'Guarantor Phone',
  guarantor_address: 'Guarantor Address',
  interest_rate: 'Interest Rate',
  total_due: 'Total Due',
  loan_amount: 'Loan Amount',
  payment_plan: 'Payment Plan',
  status: 'Status',
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getChangedFields(oldData: any, newData: any) {
  if (!oldData || !newData) return [];
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  const skip = ['last_modified_by', 'last_modified_by_name', 'last_modified_at', 'changes', 'client_name'];
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  for (const key of allKeys) {
    if (skip.includes(key)) continue;
    if (String(oldData[key]) !== String(newData[key])) {
      changes.push({ field: key, oldValue: oldData[key], newValue: newData[key] });
    }
  }
  return changes;
}

function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (['loan_amount', 'total_due', 'interest_amount', 'installment_amount', 'amount'].includes(field)) {
    return formatCurrency(Number(value));
  }
  if (field === 'interest_rate') return `${Number(value).toFixed(2)}%`;
  return String(value);
}

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    CREATE_CLIENT: 'bg-green-100 text-green-800',
    CREATE_LOAN: 'bg-blue-100 text-blue-800',
    CREATE_AND_DISBURSE_LOAN: 'bg-blue-200 text-blue-900',
    RECORD_PAYMENT: 'bg-purple-100 text-purple-800',
    UPDATE_CLIENT: 'bg-yellow-100 text-yellow-800',
    UPDATE_INTEREST_RATE: 'bg-orange-100 text-orange-800',
    UPDATE_LOAN: 'bg-yellow-100 text-yellow-800',
  };
  const color = colorMap[action] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${color}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

// ─── RECORD PAYMENT ────────────────────────────────────────────────────────────
function PaymentChanges({ log }: { log: AuditLog }) {
  const d = log.new_data;
  const loanInfo = log.loan_info;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="border-l-2 border-purple-300 pl-2">
        <div className="font-semibold text-secondary mb-0.5">Amount Paid</div>
        <div className="text-purple-700 font-bold text-sm">{formatCurrency(Number(d?.amount ?? 0))}</div>
      </div>
      {d?.payment_date && (
        <div className="border-l-2 border-sage pl-2">
          <div className="font-semibold text-secondary mb-0.5">Payment Date</div>
          <div>{d.payment_date}</div>
        </div>
      )}
      {d?.account_type && (
        <div className="border-l-2 border-sage pl-2">
          <div className="font-semibold text-secondary mb-0.5">Method</div>
          <div>{d.account_type}</div>
        </div>
      )}
      {loanInfo && (
        <div className="border-l-2 border-blue-300 pl-2">
          <div className="font-semibold text-secondary mb-0.5">Loan Details</div>
          <div>Principal: {formatCurrency(loanInfo.loan_amount)}</div>
          <div>Plan: <span className="capitalize">{loanInfo.payment_plan}</span></div>
          <div>Installment: {formatCurrency(loanInfo.installment_amount)}</div>
        </div>
      )}
    </div>
  );
}

// ─── UPDATE CLIENT ─────────────────────────────────────────────────────────────
function ClientChanges({ log }: { log: AuditLog }) {
  let changes: { field: string; oldValue: any; newValue: any }[] = [];

  if (log.new_data?.changes && Array.isArray(log.new_data.changes)) {
    changes = log.new_data.changes.map((c: any, i: number) => ({
      field: c.field,
      oldValue: log.old_data?.changes?.[i]?.old_value ?? c.old_value,
      newValue: c.new_value,
    }));
  } else {
    changes = getChangedFields(log.old_data, log.new_data);
  }

  if (changes.length === 0) {
    return <span className="text-secondary text-xs italic">No field changes recorded</span>;
  }

  return (
    <div className="space-y-2">
      {changes.map((change, idx) => (
        <div key={idx} className="text-xs border-l-2 border-yellow-300 pl-2">
          <div className="font-semibold text-secondary capitalize mb-0.5">
            {getFieldLabel(change.field)}
          </div>
          <div className="text-red-500 line-through">{formatFieldValue(change.field, change.oldValue)}</div>
          <div className="text-green-700 font-semibold">{formatFieldValue(change.field, change.newValue)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── UPDATE INTEREST RATE ──────────────────────────────────────────────────────
function InterestChanges({ log }: { log: AuditLog }) {
  const old = log.old_data;
  const next = log.new_data;
  if (!old || !next) return <span className="text-secondary text-xs italic">No data</span>;

  const oldRate = Number(old.interest_rate ?? 0);
  const newRate = Number(next.interest_rate ?? 0);
  const oldTotal = Number(old.total_due ?? 0);
  const newTotal = Number(next.total_due ?? 0);
  const oldPrincipal = Number(old.loan_amount ?? (oldTotal / (1 + oldRate / 100)));
  const newPrincipal = Number(next.loan_amount ?? oldPrincipal);
  const oldInterest = oldPrincipal * (oldRate / 100);
  const newInterest = newPrincipal * (newRate / 100);
  const interestDiff = newInterest - oldInterest;
  const totalDiff = newTotal - oldTotal;

  return (
    <div className="space-y-2 text-xs">
      <div className="border-l-2 border-orange-300 pl-2">
        <div className="font-semibold text-secondary mb-0.5">Interest Rate</div>
        <span className="text-red-500 line-through">{oldRate.toFixed(2)}%</span>
        {' → '}
        <span className="text-green-700 font-semibold">{newRate.toFixed(2)}%</span>
      </div>
      <div className="border-l-2 border-orange-300 pl-2">
        <div className="font-semibold text-secondary mb-0.5">Interest Amount</div>
        <span className="text-red-500 line-through">{formatCurrency(oldInterest)}</span>
        {' → '}
        <span className="text-green-700 font-semibold">{formatCurrency(newInterest)}</span>
        <div className={`font-bold mt-0.5 ${interestDiff >= 0 ? 'text-orange-600' : 'text-green-700'}`}>
          Diff: {interestDiff >= 0 ? '+' : ''}{formatCurrency(interestDiff)}
        </div>
      </div>
      <div className="border-l-2 border-orange-300 pl-2">
        <div className="font-semibold text-secondary mb-0.5">Total Due</div>
        <span className="text-red-500 line-through">{formatCurrency(oldTotal)}</span>
        {' → '}
        <span className="text-green-700 font-semibold">{formatCurrency(newTotal)}</span>
        <div className={`font-bold mt-0.5 ${totalDiff >= 0 ? 'text-orange-600' : 'text-green-700'}`}>
          Diff: {totalDiff >= 0 ? '+' : ''}{formatCurrency(totalDiff)}
        </div>
      </div>
    </div>
  );
}

// ─── CREATE / DISBURSE LOAN ────────────────────────────────────────────────────
function LoanCreatedChanges({ log }: { log: AuditLog }) {
  const d = log.new_data;
  if (!d) return null;
  return (
    <div className="space-y-1.5 text-xs">
      {d.loan_amount && (
        <div className="border-l-2 border-blue-300 pl-2">
          <div className="font-semibold text-secondary mb-0.5">Loan Amount</div>
          <div className="text-blue-700 font-bold">{formatCurrency(d.loan_amount)}</div>
        </div>
      )}
      {d.total_due && (
        <div className="border-l-2 border-blue-300 pl-2">
          <div className="font-semibold text-secondary mb-0.5">Total Due</div>
          <div>{formatCurrency(d.total_due)}</div>
        </div>
      )}
      {d.status && (
        <div className="border-l-2 border-blue-300 pl-2">
          <div className="font-semibold text-secondary mb-0.5">Status</div>
          <span className={`px-1.5 py-0.5 rounded text-xs ${d.status === 'disbursed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {d.status}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Generic fallback ──────────────────────────────────────────────────────────
function GenericChanges({ log }: { log: AuditLog }) {
  const changes = getChangedFields(log.old_data, log.new_data);
  if (changes.length > 0) {
    return (
      <div className="space-y-2">
        {changes.map((change, idx) => (
          <div key={idx} className="text-xs border-l-2 border-sage pl-2">
            <div className="font-semibold text-secondary mb-0.5">{getFieldLabel(change.field)}</div>
            <span className="text-red-500 line-through">{formatFieldValue(change.field, change.oldValue)}</span>
            {' → '}
            <span className="text-green-700 font-semibold">{formatFieldValue(change.field, change.newValue)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (log.new_data) {
    return <div className="text-xs text-secondary italic">{JSON.stringify(log.new_data).slice(0, 80)}...</div>;
  }
  return null;
}

function ChangesCell({ log }: { log: AuditLog }) {
  switch (log.action) {
    case 'UPDATE_CLIENT': return <ClientChanges log={log} />;
    case 'UPDATE_INTEREST_RATE': return <InterestChanges log={log} />;
    case 'RECORD_PAYMENT': return <PaymentChanges log={log} />;
    case 'CREATE_LOAN':
    case 'CREATE_AND_DISBURSE_LOAN': return <LoanCreatedChanges log={log} />;
    default: return <GenericChanges log={log} />;
  }
}

export default function AuditPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

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

    const enrichedLogs: AuditLog[] = await Promise.all((data || []).map(async (log) => {
      let clientName: string | null = null;
      let loanInfo = null;

      // ── Step 1: try to get name directly from stored data
      clientName =
        log.new_data?.client_name ||
        log.new_data?.full_name ||
        log.old_data?.client_name ||
        log.old_data?.full_name ||
        null;

      // ── Step 2: if record is a loan, look up via record_id
      if (!clientName && log.record_id && log.table_name === 'loans') {
        const { data: loan } = await supabase
          .from('loans')
          .select('loan_amount, payment_plan, installment_amount, clients(full_name)')
          .eq('id', log.record_id)
          .single();
        if (loan) {
          const c = loan.clients as any;
          clientName = Array.isArray(c) ? c[0]?.full_name : c?.full_name || null;
          loanInfo = {
            client_name: clientName || '',
            loan_amount: loan.loan_amount,
            payment_plan: loan.payment_plan,
            installment_amount: loan.installment_amount,
          };
        }
      }

      // ── Step 3: if new_data has a loan_id, look up via that
      if (!clientName && log.new_data?.loan_id) {
        const { data: loan } = await supabase
          .from('loans')
          .select('loan_amount, payment_plan, installment_amount, clients(full_name)')
          .eq('id', log.new_data.loan_id)
          .single();
        if (loan) {
          const c = loan.clients as any;
          clientName = Array.isArray(c) ? c[0]?.full_name : c?.full_name || null;
          loanInfo = {
            client_name: clientName || '',
            loan_amount: loan.loan_amount,
            payment_plan: loan.payment_plan,
            installment_amount: loan.installment_amount,
          };
        }
      }

      // ── Step 4: if record is a client, look it up directly
      if (!clientName && log.record_id && log.table_name === 'clients') {
        const { data: client } = await supabase
          .from('clients')
          .select('full_name')
          .eq('id', log.record_id)
          .single();
        if (client) clientName = client.full_name;
      }

      return { ...log, client_name: clientName, loan_info: loanInfo };
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

  return (
    <div>
      <Header title="Audit Trail" subtitle="System Activity Log" />

      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="flex items-end">
              <Button onClick={fetchLogs} disabled={loading} className="w-full">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-sage bg-cream">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary whitespace-nowrap">Date & Time</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary whitespace-nowrap">User</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary">Role</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary">Action</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary whitespace-nowrap">Client</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-primary" style={{ minWidth: 240 }}>Details / Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-secondary">
                      {startDate || endDate ? 'No logs found for selected dates' : 'No audit logs found'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-sage hover:bg-cream" style={{ verticalAlign: 'top' }}>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="py-3 px-3 text-sm font-semibold whitespace-nowrap">{log.user_name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 bg-lavender rounded text-xs capitalize whitespace-nowrap">
                          {log.user_role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-primary whitespace-nowrap">
                        {log.client_name || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <ChangesCell log={log} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}