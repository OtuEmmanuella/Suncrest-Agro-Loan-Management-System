# 💰 Loan Management System

A complete loan management application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## ✨ Features

- **User Authentication** - Admin and Manager roles with secure login
- **Client Management** - Register and manage borrowers
- **Loan Processing** - Create loans with automatic interest calculations
- **Disbursement Tracking** - Manage pending and active loans
- **Repayment System** - Record and track loan payments
- **Comprehensive Reports** - View analytics and financial summaries
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🎨 Color Palette

- Primary: `#364132` (Dark Green)
- Secondary: `#343733` (Charcoal)
- Sage: `#B3B5A6` (Light Gray-Green)
- Cream: `#FEFBEE` (Main Background)
- Lavender: `#AAA9C4` (Accent)
- Off-White: `#FDFCF4` (Card Background)

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- Git (optional)

## 🚀 Quick Start

### 1. Clone or Download

```bash
# If you have Git
git clone <repository-url>
cd loan-management-system

# Or just download and extract the ZIP file
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up
4. Go to **Project Settings > API**
5. Copy your:
   - Project URL
   - `anon` public key

### 4. Run Database Setup

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-setup.sql`
4. Paste and click **Run**
5. This creates all tables, indexes, and a default admin user

### 5. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-random-secret-minimum-32-characters
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate JWT_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use any random 32+ character string
```

### 6. Create Admin User Password

1. Go to [bcrypt-generator.com](https://bcrypt-generator.com/)
2. Enter your desired password (e.g., `admin123`)
3. Click "Generate Hash"
4. Copy the hash
5. In Supabase SQL Editor, run:

```sql
UPDATE users 
SET password_hash = '$2a$10$YourGeneratedHashHere'
WHERE email = 'admin@loanapp.com';
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Default Login:**
- Email: `admin@loanapp.com`
- Password: `admin123` (or whatever you set)

## 📁 Project Structure

```
loan-management-system/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages
│   │   └── login/
│   ├── (dashboard)/             # Protected dashboard pages
│   │   ├── clients/
│   │   ├── loans/
│   │   ├── repayments/
│   │   └── reports/
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── loans/
│   │   └── payments/
│   └── globals.css
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── dashboard/               # Dashboard-specific
│   ├── clients/
│   ├── loans/
│   └── reports/
├── lib/                         # Utilities and configs
│   ├── supabase/               # Database client
│   ├── utils/                  # Helper functions
│   └── hooks/                  # Custom React hooks
├── types/                       # TypeScript definitions
└── public/                      # Static assets
```

## 🔐 Authentication Flow

1. User enters credentials on `/login`
2. API verifies against Supabase `users` table
3. On success, creates JWT session cookie
4. Middleware protects all dashboard routes
5. Session expires after 7 days or on logout

## 💼 User Workflow

### Register a Client
1. Click "New Client" from dashboard
2. Fill in name, phone, address, ID number
3. Save → Client added to database

### Create a Loan
1. Click "New Loan"
2. Select client from dropdown
3. Enter loan amount and interest rate
4. Choose payment plan (daily/weekly/monthly)
5. Set duration (number of payments)
6. System auto-calculates:
   - Total repayable amount
   - Per-installment amount
7. Set status (Pending or Disbursed)
8. Save

### Disburse a Loan
1. Go to "Pending" page
2. See all loans awaiting disbursement
3. Click "Disburse" button
4. Confirms and updates status

### Record Repayment
1. Go to "Repayments"
2. Select loan from active loans list
3. Enter payment amount
4. Select payment date
5. Choose account paid into
6. Submit → payment recorded, balance updated

### View Reports
1. Go to "Reports"
2. Set date range and filters
3. View totals and breakdowns
4. Export to PDF or Excel (future feature)

## 🗃️ Database Schema

### users
- id, email, password_hash, role, created_at

### clients
- id, name, phone, address, id_card_number, created_at, created_by

### loans
- id, client_id, principal_amount, interest_rate, total_amount
- payment_plan, payment_count, installment_amount
- status, disbursed_date, created_at, created_by

### payments
- id, loan_id, amount, payment_date, account_paid_into
- created_at, recorded_by

## 🛠️ Development

### Add a New User
```sql
-- Generate hash at bcrypt-generator.com first
INSERT INTO users (email, password_hash, role) 
VALUES ('manager@loanapp.com', '$2a$10$hash...', 'manager');
```

### Run Migrations
```bash
# If you make database changes, document them in supabase-setup.sql
```

### Build for Production
```bash
npm run build
npm start
```

## 🎯 Next Steps (Future Enhancements)

- [ ] SMS notifications for payment reminders
- [ ] PDF report generation
- [ ] Excel export functionality
- [ ] Client photo uploads
- [ ] Loan contract PDF generation
- [ ] Email notifications
- [ ] Multi-currency support
- [ ] Loan calculator widget
- [ ] Payment schedule preview
- [ ] Overdue loan alerts

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check your `.env.local` file
- Verify Supabase project URL and anon key
- Ensure Supabase project is active

### "Login failed"
- Verify password hash was updated in database
- Check email spelling
- Ensure users table has the admin record

### "Loans not showing"
- Check if loans table has data
- Verify API routes are working
- Check browser console for errors

### Database Connection Issues
- Ensure RLS policies allow access
- Check Supabase dashboard for errors
- Verify API keys are correct

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Check browser console for JavaScript errors
4. Verify all environment variables are set

## 📝 License

This project is proprietary. All rights reserved.

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [date-fns](https://date-fns.org/)
- [Lucide Icons](https://lucide.dev/)
