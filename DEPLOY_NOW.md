# 🚀 Production Deployment - Step by Step Guide

Follow these steps in order. I'll help you through each one.

## ✅ Pre-Deployment Checklist

**Generated CRON_SECRET**: `XCgNYm3Qjv+27bFWRZ/tC3fQv9I7B6z7c4VTyFJpi5U=`
(Save this - you'll need it for Vercel environment variables)

---

## Step 1: Prepare Code for Deployment

### 1.1 Commit All Changes

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Add all files
git add .

# Commit
git commit -m "Prepare for production deployment - add favicon, improvements, and deployment configs"
```

### 1.2 Create GitHub Repository (if not exists)

**Option A: Create via GitHub Website**
1. Go to https://github.com/new
2. Repository name: `vacation-management` (or your preferred name)
3. Set to **Private** (recommended for internal tools)
4. **Don't** initialize with README (you already have one)
5. Click "Create repository"

**Option B: Create via GitHub CLI** (if you have `gh` installed)
```bash
gh repo create vacation-management --private --source=. --remote=origin --push
```

### 1.3 Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/vacation-management.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Supabase Production Database

### 2.1 Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `vacation-management-prod`
   - **Database Password**: Generate a strong password ⚠️ **SAVE THIS PASSWORD**
   - **Region**: Choose closest to your users (e.g., `eu-west-1` for Europe)
   - **Pricing Plan**: Free tier is fine to start
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### 2.2 Get Supabase Credentials

Once project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them for Vercel):
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

### 2.3 Get Database Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"Session mode"** tab (important!)
4. Copy the connection string → This is your `DATABASE_URL`
   - Should look like: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - **Important**: Must use port **6543** (Session mode), not 5432

### 2.4 Push Database Schema

```bash
# Set your production DATABASE_URL temporarily
export DATABASE_URL="your_production_connection_string_from_step_2.3"

# Generate Prisma Client
npm run db:generate

# Push schema to production database
npx prisma db push --skip-generate

# Verify it worked (should see "Database schema is up to date")
```

**Alternative**: If you prefer, you can do this after Vercel deployment, but doing it now ensures the database is ready.

---

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Account & Import Project

1. Go to https://vercel.com and sign in (use GitHub account)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Find and select your `vacation-management` repository
5. Click **"Import"**

### 3.2 Configure Project Settings

Vercel should auto-detect Next.js. Verify:
- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.next` ✅
- **Install Command**: `npm install` ✅

### 3.3 Add Environment Variables

**Before clicking Deploy**, add these environment variables:

Click **"Environment Variables"** and add each one:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase Project URL from Step 2.2
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon key from Step 2.2
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service role key from Step 2.2
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ **Keep this secret!**

4. **DATABASE_URL**
   - Value: Your Session mode connection string from Step 2.3
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - ⚠️ **Must use port 6543 (Session mode)**

5. **NEXTAUTH_URL**
   - Value: `https://your-app-name.vercel.app` (we'll update this after first deploy)
   - For now, use: `https://vacation-management.vercel.app` (or whatever Vercel suggests)

6. **CRON_SECRET**
   - Value: `XCgNYm3Qjv+27bFWRZ/tC3fQv9I7B6z7c4VTyFJpi5U=`
   - This protects your cron endpoint

**Important**: Make sure all variables are added to **Production** environment (and optionally Preview/Development if you want).

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build to complete
3. Once deployed, note your production URL: `https://your-app-name.vercel.app`

### 3.5 Update NEXTAUTH_URL

1. After first deployment, go to **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual production URL
3. Redeploy (or wait for automatic redeploy)

---

## Step 4: Create Admin User

### 4.1 Create Auth User in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email**: `admin@yourcompany.com` (use your actual email)
   - **Password**: Generate a strong password ⚠️ **SAVE THIS**
   - **Auto Confirm User**: ✅ Check this box
4. Click **"Create User"**

### 4.2 Create User Record in Database

**Option A: Via SQL Editor (Recommended)**

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Run this SQL (replace email with your admin email):

```sql
INSERT INTO "User" (
  id,
  email,
  name,
  role,
  "employmentDate",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',  -- Replace with your admin email
  'Admin User',              -- Replace with your name
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

4. Click **"Run"**
5. Verify: Go to **Table Editor** → **User** table → You should see your admin user

**Option B: Via Application** (after logging in)
- Try logging in first - if it works, great! If you get "User not found", use Option A.

---

## Step 5: Verify Deployment

### 5.1 Test Login

1. Go to your production URL: `https://your-app-name.vercel.app`
2. You should be redirected to `/auth/login`
3. Log in with your admin credentials
4. You should see the Admin Dashboard

### 5.2 Test Core Features

- [ ] **Dashboard**: Can see admin dashboard
- [ ] **User Management**: Can view users list
- [ ] **Create User**: Can create a new user
- [ ] **Vacation Request**: Create a test employee and request vacation
- [ ] **Calendar**: Calendar displays correctly

### 5.3 Test API Endpoints

Check Vercel deployment logs:
1. Go to Vercel Dashboard → **Deployments** → Click on your deployment
2. Check **"Functions"** tab for any errors
3. Check **"Logs"** tab for runtime errors

---

## Step 6: Set Up Cron Job (Optional)

### 6.1 Verify Cron Configuration

Your `vercel.json` is already configured. Vercel Cron should automatically set it up.

**Note**: Vercel Cron on free tier has limitations. If it doesn't work:

**Option A: Use External Cron Service** (Free)
1. Go to https://cron-job.org (or similar)
2. Create a cron job that calls:
   ```
   https://your-app-name.vercel.app/api/cron/monthly-accrual
   ```
3. Set Authorization header: `Bearer XCgNYm3Qjv+27bFWRZ/tC3fQv9I7B6z7c4VTyFJpi5U=`
4. Schedule: `0 0 1 * *` (1st of every month at midnight UTC)

**Option B: Upgrade to Vercel Pro** ($20/month)
- Includes unlimited cron jobs

---

## 🎉 You're Live!

Your application is now deployed at: `https://your-app-name.vercel.app`

### Next Steps:
1. ✅ Share the URL with your team
2. ✅ Create additional users via Admin panel
3. ✅ Set up monitoring (optional)
4. ✅ Document your deployment process

---

## 🐛 Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure `postinstall` script includes `prisma generate` ✅ (already done)

### Database Connection Error
- Verify `DATABASE_URL` uses **Session mode** (port 6543)
- Check Supabase project is active
- Verify IP allowlist in Supabase (if enabled)

### "User not found" After Login
- Create User record in database (Step 4.2)

### "Unauthorized" Errors
- Check environment variables are set correctly
- Verify Supabase keys are correct

---

## 📝 Quick Reference

**Your CRON_SECRET**: `XCgNYm3Qjv+27bFWRZ/tC3fQv9I7B6z7c4VTyFJpi5U=`

**Environment Variables Checklist**:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] DATABASE_URL (Session mode, port 6543)
- [ ] NEXTAUTH_URL (production domain)
- [ ] CRON_SECRET

---

Need help? Check `DEPLOYMENT.md` for detailed troubleshooting.
