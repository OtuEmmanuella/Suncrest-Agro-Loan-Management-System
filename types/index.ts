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
   last_modified_by?: string;
  last_modified_by_name?: string;
  last_modified_at?: string;
}

export type PaymentPlan = 'daily' | 'weekly' | 'monthly';
export type LoanStatus = 'pending' | 'disbursed' | 'completed';
export type DurationUnit = 'days' | 'weeks' | 'months'; 

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
  duration_months: number;   // kept for backward compatibility
  duration_value?: number;   // NEW: numeric value (e.g., 3, 7, 14)
  duration_unit?: DurationUnit; // NEW: unit (days, weeks, months)
  status: LoanStatus;
  disbursed_date?: string;
  total_paid: number;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  disbursed_by_name?: string;
  installment_amount: number;
    registration_fee?: number;
  admin_fee?: number;
  registration_fee_paid?: number;
  admin_fee_paid?: number;
}

export interface DashboardStats {
  total_disbursed: number;
  total_repaid: number;
  pending_amount: number;
  total_clients: number;
}

export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  account_type: string;
  created_at: string;
  recorded_by?: string;
  recorded_by_name?: string;
}

// NEW: Fee statistics for reports
export interface FeeStats {
  total_registration_fees: number;
  total_admin_fees: number;
  total_interest: number;
  total_profit: number; // fees + interest
  total_revenue: number; // repaid + fees + interest
}