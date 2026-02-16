// types/index.ts
export interface Client {
  id: string;
  name?: string;           // for compatibility
  full_name?: string;      // your schema
  phone?: string;          // for compatibility
  phone_number?: string;   // your schema
  address: string;
  id_card_number?: string; // for compatibility
  id_card?: string;        // your schema
  created_at: string;
  created_by: string;
}

export type PaymentPlan = 'daily' | 'weekly' | 'monthly';
export type LoanStatus = 'pending' | 'disbursed' | 'completed';

export interface Loan {
  id: string;
  client_id: string;
  clients?: Client;
  loan_amount: number;
  principal_amount?: number; // for compatibility
  interest_rate: number;
  total_due: number;
  total_amount?: number;     // for compatibility
  payment_plan: PaymentPlan;
  duration_months: number;
  status: LoanStatus;
  disbursed_date?: string;
  total_paid: number;
  created_at: string;
  created_by: string;
}

export interface DashboardStats {
  total_disbursed: number;
  total_repaid: number;
  pending_amount: number;
  total_clients: number;
}