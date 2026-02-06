# Quick Setup Guide

Follow these steps to get your Vacation Management app running:

## Step 1: Install Dependencies

```bash
cd vacation-management
npm install
```

## Step 2: Set Up Supabase

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Fill in project details (name, database password, region)
   - Wait for project to be provisioned (~2 minutes)

2. **Get Your Credentials**
   - Go to **Settings** → **API**
   - Copy these values:
     - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

3. **Get Database Connection String**
   - Go to **Settings** → **Database**
   - Under "Connection string", select "URI"
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - This is your `DATABASE_URL`

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres
NEXTAUTH_URL=http://localhost:3000
```

## Step 4: Set Up Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

This creates all necessary tables in your Supabase database.

## Step 5: Create Your First Admin User

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: (choose a secure password)
   - Auto Confirm User: ✅ (checked)
4. Click **"Create User"**
5. Note the email address you used

**Then create the User record in your database:**

Go to **SQL Editor** in Supabase and run:

```sql
INSERT INTO "User" (id, email, name, role, "employmentDate", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',  -- Replace with your email
  'Admin User',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

**Option B: Via API (After first login)**

1. Create auth user in Supabase Dashboard (as above)
2. Login with that user
3. Use the admin panel to create the User record (once you have admin access)

## Step 6: Run the Application

```bash
npm run dev
```

Visit http://localhost:3000

You should see the login page. Use the credentials you created in Step 5.

## Step 7: Create Test Users (Optional)

Once logged in as admin, you can:
1. Go to Admin Dashboard
2. Click "Create User"
3. Create employees and managers
4. Assign employees to managers

## Troubleshooting

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Database connection error"
- Verify your `DATABASE_URL` is correct
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Check that your Supabase project is fully provisioned

### "User not found" after login
- Make sure you created the User record in the database (Step 5)
- The email must match exactly between Supabase Auth and your User table

### "Unauthorized" errors
- Make sure your environment variables are set correctly
- Restart your dev server after changing `.env`

## Next Steps

- **Deploy to Vercel**: Push to GitHub and import to Vercel
- **Set up cron job**: The monthly accrual cron is configured in `vercel.json`
- **Customize**: Adjust vacation rules, roles, or UI as needed

## Need Help?

Check the main `README.md` for detailed documentation.
