-- Supabase Database Setup for Loan Management System
-- Run this SQL in your Supabase SQL Editor

-- 1. Create users table (for authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  id_card_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 3. Create loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  principal_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_plan TEXT NOT NULL CHECK (payment_plan IN ('daily', 'weekly', 'monthly')),
  payment_count INTEGER NOT NULL,
  installment_amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disbursed', 'completed', 'defaulted')),
  disbursed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 4. Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  account_paid_into TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id)
);

-- 5. Create indexes for better query performance
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_loans_client_id ON loans(client_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_created_at ON loans(created_at DESC);
CREATE INDEX idx_payments_loan_id ON payments(loan_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- 6. Insert default admin user
-- Password: admin123 (hashed with bcrypt - you should change this!)
-- Generate your own hash at: https://bcrypt-generator.com/
INSERT INTO users (email, password_hash, role) VALUES 
('admin@loanapp.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- 7. Create view for loans with client details
CREATE OR REPLACE VIEW loans_with_clients AS
SELECT 
  l.*,
  c.name as client_name,
  c.phone as client_phone,
  c.address as client_address
FROM loans l
JOIN clients c ON l.client_id = c.id;

-- 8. Create view for loan summaries with payment totals
CREATE OR REPLACE VIEW loan_summaries AS
SELECT 
  l.*,
  c.name as client_name,
  COALESCE(SUM(p.amount), 0) as total_paid,
  l.total_amount - COALESCE(SUM(p.amount), 0) as balance_remaining
FROM loans l
JOIN clients c ON l.client_id = c.id
LEFT JOIN payments p ON l.id = p.loan_id
GROUP BY l.id, c.name;

-- 9. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - refine based on your needs)
CREATE POLICY "Allow all operations for authenticated users" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON loans FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON payments FOR ALL USING (true);

-- 10. Sample data (optional - for testing)
-- Insert a sample client
INSERT INTO clients (name, phone, address, id_card_number) VALUES 
('John Doe', '080-1234-5678', '123 Main Street, Lagos', 'NIN123456789');

-- Insert a sample loan (you'll need to update client_id and created_by with actual UUIDs)
-- INSERT INTO loans (client_id, principal_amount, interest_rate, total_amount, payment_plan, payment_count, installment_amount, status, created_by)
-- VALUES ('client-uuid-here', 50000, 10, 55000, 'weekly', 12, 4583.33, 'pending', 'user-uuid-here');
