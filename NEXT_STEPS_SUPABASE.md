# Next Steps: Supabase Setup

Your code is now on GitHub! ✅

## Step 1: Create Supabase Project

1. **Go to**: https://supabase.com
2. **Sign in** (or create account if needed)
3. Click **"New Project"**
4. Fill in:
   - **Name**: `vacation-management-prod`
   - **Database Password**: Generate a strong password ⚠️ **SAVE THIS PASSWORD**
   - **Region**: Choose closest to your users (e.g., `eu-west-1` for Europe)
   - **Pricing Plan**: Free tier is fine to start
5. Click **"Create new project"**
6. **Wait 2-3 minutes** for provisioning

---

## Step 2: Get Supabase Credentials

Once project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them for Vercel):
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
     - Example: `https://abcdefghijklmnop.supabase.co`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**
     - Also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Step 3: Get Database Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Click on **"Session mode"** tab (important!)
4. Copy the connection string → This is your `DATABASE_URL`
   - Should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - **Important**: Must use port **6543** (Session mode), not 5432

---

## Step 4: Push Database Schema

After you have the `DATABASE_URL`, run:

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Set your production DATABASE_URL temporarily
export DATABASE_URL="your_production_connection_string_from_step_3"

# Generate Prisma Client
npm run db:generate

# Push schema to production database
npx prisma db push --skip-generate
```

You should see: `Database schema is up to date` or similar success message.

---

## Step 5: Save Your Credentials

**Save these values** - you'll need them for Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

---

**Once you've completed these steps, let me know and we'll proceed to Vercel deployment!**

Or if you want, I can help you with each step as you go.
