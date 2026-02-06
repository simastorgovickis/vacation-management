# Production Deployment Guide

This guide will walk you through deploying the Vacation Management application to production on Vercel with Supabase.

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] All code changes committed to Git
- [ ] All tests passing (if you have any)
- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] Admin user creation process documented
- [ ] Logo and branding assets ready (`public/logo.png`)

## 🗄️ Step 1: Set Up Supabase Production Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `vacation-management-prod` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient to start

4. Wait for project provisioning (2-3 minutes)

### 1.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy the following values (you'll need them for Vercel):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

### 1.3 Get Database Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"Session mode"** (for connection pooling)
4. Copy the connection string → `DATABASE_URL`
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - **Important**: Use the **pooler** connection string (port 6543) for production, not direct connection (port 5432)

### 1.4 Push Database Schema

**Option A: Using Prisma CLI (Recommended)**

```bash
# From your local machine
cd vacation-management

# Set your production DATABASE_URL temporarily
export DATABASE_URL="your_production_connection_string"

# Generate Prisma Client
npm run db:generate

# Push schema to production database
npx prisma db push --skip-generate

# Verify schema was created
npx prisma studio --browser none
# Then open http://localhost:5555 to verify tables exist
```

**Option B: Using Supabase SQL Editor**

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the schema from `prisma/schema.prisma`
3. Convert Prisma schema to SQL (or use Prisma Migrate)
4. Run the SQL in the editor

**Recommended**: Use Option A (Prisma CLI) as it's safer and handles migrations properly.

## 🚀 Step 2: Deploy to Vercel

### 2.1 Prepare Your Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Ensure `.env` is in `.gitignore`** (it should be by default)

### 2.2 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (or `vacation-management` if repo root)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 2.3 Configure Environment Variables

In Vercel project settings, add these environment variables:

#### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
NEXTAUTH_URL=https://your-app-name.vercel.app
CRON_SECRET=generate_a_random_secret_here_min_32_chars
```

#### How to Generate CRON_SECRET

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important Notes**:
- `NEXTAUTH_URL` should be your production domain (update after first deployment)
- `CRON_SECRET` is used to protect the cron endpoint - keep it secret!
- All variables are case-sensitive
- Use **Session mode** connection string for `DATABASE_URL` (port 6543)

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Once deployed, note your production URL: `https://your-app-name.vercel.app`

### 2.5 Update NEXTAUTH_URL

1. Go to **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual production URL
3. Redeploy (or wait for automatic redeploy)

## ⏰ Step 3: Configure Cron Job

### 3.1 Verify Cron Configuration

The `vercel.json` file should already be configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-accrual",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

This runs at midnight UTC on the 1st of every month.

### 3.2 Set Up Cron Secret Protection

1. In Vercel Dashboard → **Settings** → **Environment Variables**
2. Add `CRON_SECRET` (you already did this in Step 2.3)
3. The cron endpoint will automatically use this secret

### 3.3 Test Cron Endpoint (Optional)

After deployment, you can manually test the cron endpoint:

```bash
# Get your CRON_SECRET from Vercel environment variables
curl -X GET https://your-app-name.vercel.app/api/cron/monthly-accrual \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response: `{"success":true,"message":"Monthly accrual processed successfully"}`

**Note**: Vercel Cron will automatically add the Authorization header when calling your endpoint.

## 👤 Step 4: Create Admin User

### 4.1 Create Auth User in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email**: `admin@yourcompany.com` (use your actual email)
   - **Password**: Generate a strong password
   - **Auto Confirm User**: ✅ Check this (so user can log in immediately)
4. Click **"Create User"**
5. **Save the email and password** - you'll need them to log in

### 4.2 Create User Record in Database

**Option A: Via Application (Recommended)**

1. Log in to your deployed app: `https://your-app-name.vercel.app/auth/login`
2. Use the email/password from Step 4.1
3. You'll be redirected to the dashboard
4. If you see an error about "User not found", proceed to Option B

**Option B: Via SQL Editor**

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace email with your admin email):

```sql
-- First, get the auth user ID
-- Go to Authentication → Users and find your user's UUID

-- Then insert into User table
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
  gen_random_uuid(),  -- Or use a specific UUID if you prefer
  'admin@yourcompany.com',  -- Your admin email
  'Admin User',  -- Display name
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

**Option C: Via API (After First Login)**

If you've logged in but don't have a User record:
1. The app should handle this gracefully, but you may need to create the User record manually via SQL

### 4.3 Verify Admin Access

1. Log in at `https://your-app-name.vercel.app/auth/login`
2. You should see the Admin Dashboard
3. Verify you can:
   - See "User Management" section
   - Access "Countries & Holidays"
   - View audit logs

## ✅ Step 5: Post-Deployment Verification

### 5.1 Test Core Functionality

- [ ] **Authentication**: Log in/out works
- [ ] **Dashboard**: Role-specific dashboard loads correctly
- [ ] **User Management** (Admin): Can view users list
- [ ] **Vacation Request** (Employee): Can create a vacation request
- [ ] **Approval Flow** (Manager): Can approve/reject requests
- [ ] **Calendar**: Calendar displays correctly
- [ ] **Profile**: Can view and update profile

### 5.2 Test API Endpoints

```bash
# Test authentication
curl https://your-app-name.vercel.app/api/auth/me

# Test vacations endpoint (requires auth)
curl https://your-app-name.vercel.app/api/vacations \
  -H "Cookie: your-session-cookie"
```

### 5.3 Verify Database Connection

1. Go to Supabase Dashboard → **Database** → **Table Editor**
2. Verify tables exist:
   - `User`
   - `VacationRequest`
   - `VacationBalance`
   - `VacationAccrualLog`
   - `AuditLog`
   - `Country`
   - `PublicHoliday`
   - `ManagerEmployee`
   - `PasswordResetToken`

### 5.4 Check Logs

1. In Vercel Dashboard → **Deployments** → Click on your deployment
2. Check **"Functions"** tab for any errors
3. Check **"Logs"** tab for runtime errors

## 🔒 Step 6: Security Hardening

### 6.1 Environment Variables Security

- ✅ Never commit `.env` files
- ✅ Use Vercel's environment variables (not `.env` files)
- ✅ Rotate `SUPABASE_SERVICE_ROLE_KEY` periodically
- ✅ Keep `CRON_SECRET` secure

### 6.2 Supabase Security

1. **Row Level Security (RLS)**: 
   - Your app handles authorization at the application level
   - Consider enabling RLS on Supabase tables for additional security

2. **API Keys**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (it's public)
   - `SUPABASE_SERVICE_ROLE_KEY` must be kept secret (server-side only)

### 6.3 Rate Limiting

- Rate limiting is implemented in the code
- For production with high traffic, consider:
  - Upgrading to Vercel Pro for higher rate limits
  - Using Redis-based rate limiting (Upstash Redis, Vercel KV)

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Set Up Monitoring

**Vercel Analytics** (Free):
1. Go to Vercel Dashboard → **Analytics**
2. Enable Analytics (free tier available)

**Error Tracking** (Recommended):
- Set up [Sentry](https://sentry.io) or similar
- Update `lib/logger.ts` to send errors to Sentry

**Uptime Monitoring**:
- Use [UptimeRobot](https://uptimerobot.com) (free)
- Monitor: `https://your-app-name.vercel.app/api/auth/me`

### 7.2 Database Backups

**Supabase Automatic Backups**:
- Free tier: Daily backups (7-day retention)
- Pro tier: Point-in-time recovery

**Manual Backup**:
```bash
# Export database schema
npx prisma db pull

# Export data (via Supabase Dashboard → Database → Backups)
```

### 7.3 Monthly Maintenance Tasks

- [ ] Verify cron job ran successfully (check logs on 1st of month)
- [ ] Review audit logs for suspicious activity
- [ ] Check database size and performance
- [ ] Review error logs
- [ ] Update dependencies (`npm audit`)

## 🐛 Troubleshooting

### Build Fails

**Error**: "Prisma Client not generated"
- **Solution**: Ensure `postinstall` script runs: `"postinstall": "prisma generate"` in `package.json`

**Error**: "Module not found"
- **Solution**: Check all dependencies are in `package.json`, run `npm install` locally first

### Database Connection Issues

**Error**: "Can't reach database server"
- **Solution**: 
  1. Verify `DATABASE_URL` uses **pooler** connection (port 6543)
  2. Check Supabase project is active
  3. Verify IP allowlist in Supabase (if enabled)

**Error**: "Connection timeout"
- **Solution**: Use Session mode connection string, not Transaction mode

### Authentication Issues

**Error**: "User not found after login"
- **Solution**: Create User record in database (see Step 4.2)

**Error**: "Unauthorized" on API calls
- **Solution**: Check session cookies are being sent, verify Supabase keys

### Cron Job Not Running

**Issue**: Cron job doesn't execute
- **Solution**:
  1. Verify `vercel.json` is committed
  2. Check Vercel Cron is enabled (Pro feature - free tier has limitations)
  3. For free tier, use external cron service (cron-job.org) to call endpoint with `CRON_SECRET`

### Performance Issues

**Slow page loads**:
- Enable Vercel Edge Caching
- Optimize database queries
- Use Supabase connection pooling

**High database usage**:
- Check for N+1 queries
- Add database indexes if needed
- Consider upgrading Supabase plan

## 📝 Production Checklist

Before going live, ensure:

- [ ] All environment variables set in Vercel
- [ ] Database schema pushed to production
- [ ] Admin user created and can log in
- [ ] Test user created (Employee role)
- [ ] Test manager created (Manager role)
- [ ] Test vacation request flow end-to-end
- [ ] Logo and branding updated
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `CRON_SECRET` generated and set
- [ ] Error monitoring configured
- [ ] Database backups enabled
- [ ] Documentation updated with production URLs

## 🔄 Updating Production

### Making Changes

1. **Make changes locally**
2. **Test locally**: `npm run dev`
3. **Commit and push**: `git push origin main`
4. **Vercel auto-deploys** (if connected to GitHub)
5. **Verify deployment** in Vercel dashboard

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply to production (after testing)
export DATABASE_URL="your_production_connection_string"
npx prisma migrate deploy
```

### Environment Variable Updates

1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Update variable
3. Redeploy (or wait for next deployment)

## 🎉 You're Live!

Your application should now be running at: `https://your-app-name.vercel.app`

**Next Steps**:
1. Share the URL with your team
2. Create additional users via Admin panel
3. Set up monitoring and alerts
4. Document your deployment process for your team

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs)
3. Review this guide's troubleshooting section
4. Check application logs (if logging service configured)

---

**Last Updated**: February 2026
**Application Version**: 0.1.0
