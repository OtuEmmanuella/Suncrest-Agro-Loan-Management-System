# 🚀 COMPLETE SETUP GUIDE - Loan Management System

## 📖 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Environment Setup](#environment-setup)
5. [Running the Application](#running-the-application)
6. [Creating Additional Users](#creating-additional-users)
7. [Deployment](#deployment)
8. [Common Issues](#common-issues)

---

## Prerequisites

Before you start, make sure you have:

✅ **Node.js 18 or higher**
- Check: `node --version`
- Download: https://nodejs.org/

✅ **npm (comes with Node.js)**
- Check: `npm --version`

✅ **A Supabase account (free)**
- Sign up: https://supabase.com

✅ **A code editor** (VS Code recommended)
- Download: https://code.visualstudio.com/

---

## Initial Setup

### Step 1: Get the Code

**Option A: If you have the folder**
```bash
cd loan-management-system
```

**Option B: If you have a ZIP file**
1. Extract the ZIP file
2. Open terminal/command prompt
3. Navigate to the folder: `cd path/to/loan-management-system`

### Step 2: Install Dependencies

```bash
npm install
```

This will download all required packages. Takes 2-5 minutes depending on your internet speed.

**Expected output:**
```
added 250 packages in 2m
```

---

## Supabase Configuration

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: Loan Management System
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### Step 2: Get Your API Keys

1. Once project is ready, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API keys**
     - Find the **`anon` `public`** key (long string starting with `eyJ...`)

**SAVE THESE!** You'll need them in the next step.

### Step 3: Set Up Database Tables

1. In Supabase dashboard, click **SQL Editor** in sidebar
2. Click **"+ New query"**
3. Open the file `supabase-setup.sql` from your project folder
4. **Copy ALL the content** from that file
5. **Paste** into the SQL Editor
6. Click **"Run"** button (or press Ctrl/Cmd + Enter)

**Expected result:**
```
Success. No rows returned
```

This creates:
- ✅ users table
- ✅ clients table
- ✅ loans table
- ✅ payments table
- ✅ All necessary indexes and views

### Step 4: Create Admin User Password

1. Go to https://bcrypt-generator.com/
2. In the **"String to hash"** field, type: `admin123` (or your preferred password)
3. Keep **Rounds** at `10`
4. Click **"Generate Hash"**
5. Copy the generated hash (long string starting with `$2a$10$...`)
6. Back in Supabase SQL Editor, create a new query:

```sql
UPDATE users 
SET password_hash = 'PASTE_YOUR_HASH_HERE'
WHERE email = 'admin@loanapp.com';
```

7. Replace `PASTE_YOUR_HASH_HERE` with your actual hash
8. Click **"Run"**

**Expected result:**
```
Success. 1 row(s) affected
```

---

## Environment Setup

### Step 1: Create Environment File

In your project folder:

**On Mac/Linux:**
```bash
cp .env.local.example .env.local
```

**On Windows:**
```cmd
copy .env.local.example .env.local
```

### Step 2: Edit Environment File

Open `.env.local` in your code editor and fill in:

```env
# Replace with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate a random secret (see below)
JWT_SECRET=your_random_secret_here_minimum_32_characters

# Keep this as is for local development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Generate JWT Secret

**Option A: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -base64 32
```

**Option B: Manual**
Use any random string of 32+ characters. Example:
```
JWT_SECRET=9k2h8f4n6m1p3q7r5t0w8y2u4i6o0s1d3f5g7h9j
```

**Save the file!**

---

## Running the Application

### Step 1: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### Step 2: Open in Browser

1. Open your browser
2. Go to: http://localhost:3000
3. You should see the login page

### Step 3: Login

- **Email**: `admin@loanapp.com`
- **Password**: `admin123` (or whatever you set)

Click **"Sign In"**

**Success!** You should now see the dashboard.

---

## Creating Additional Users

### Add a Manager Account

1. Go to Supabase SQL Editor
2. Create new query
3. First, generate password hash at https://bcrypt-generator.com/
4. Run this SQL (replace the hash):

```sql
INSERT INTO users (email, password_hash, role) 
VALUES ('manager@loanapp.com', '$2a$10$YOUR_GENERATED_HASH', 'manager');
```

**Note:** Both admin and manager accounts have same access in current version.

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub (create repository first)
2. Go to https://vercel.com
3. Click **"Import Project"**
4. Select your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (use your vercel URL)
6. Click **"Deploy"**

Your app will be live at: `https://your-app-name.vercel.app`

---

## Common Issues

### Issue: "npm install" fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try installing again
npm install
```

### Issue: "Cannot connect to Supabase"

**Checklist:**
- [ ] Is `.env.local` in the root folder?
- [ ] Did you copy the correct Supabase URL?
- [ ] Did you copy the **anon public** key (not service_role)?
- [ ] Did you restart the dev server after adding .env.local?

**Try:**
```bash
# Stop the server (Ctrl + C)
# Start it again
npm run dev
```

### Issue: "Login failed" / "Invalid credentials"

**Checklist:**
- [ ] Did you update the password hash in Supabase?
- [ ] Are you using the correct email: `admin@loanapp.com`?
- [ ] Did you use the same password when generating the hash?

**Verify:**
```sql
-- Check if user exists
SELECT email, role FROM users WHERE email = 'admin@loanapp.com';
```

### Issue: Tables not showing in Supabase

**Solution:**
1. Go to Supabase **Table Editor**
2. Look for tables: users, clients, loans, payments
3. If missing, re-run the `supabase-setup.sql` file

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

Then visit: http://localhost:3001

---

## Testing the Application

### Test 1: Register a Client

1. Click **"+ New Client"**
2. Fill in:
   - Name: John Doe
   - Phone: 080-1234-5678
   - Address: 123 Main St, Lagos
   - ID Card: NIN123456789
3. Click **"Register Client"**
4. Should redirect to clients list

### Test 2: Create a Loan

1. Click **"+ New Loan"**
2. Select: John Doe
3. Enter:
   - Loan Amount: 50000
   - Interest Rate: 10
   - Duration: 12
4. Select: Weekly
5. Status: Pending
6. Click **"Create Loan"**

### Test 3: Disburse Loan

1. Go to **"Pending"** page
2. Find the loan you created
3. Click **"Disburse"**
4. Should move to Disbursed Loans

### Test 4: Record Payment

1. Go to **"Repayments"**
2. Click on the loan
3. Click **"Make Payment"**
4. Enter amount: 4583
5. Select date and account
6. Click **"Submit Payment"**
7. Balance should update

---

## Next Steps

Once everything is working:

1. ✅ Change default admin password
2. ✅ Create manager accounts for your team
3. ✅ Start registering real clients
4. ✅ Process your first loans
5. ✅ Customize the colors if needed (edit `tailwind.config.js`)
6. ✅ Deploy to production when ready

---

## Getting Help

If you're stuck:

1. Check this guide again carefully
2. Look at the `README.md` for additional info
3. Check browser console for errors (F12 in browser)
4. Check Supabase logs in the dashboard
5. Verify all environment variables are set correctly

---

## Contact & Support

For technical support or custom modifications, contact your development team.

**Good luck with your loan management system!** 🎉
