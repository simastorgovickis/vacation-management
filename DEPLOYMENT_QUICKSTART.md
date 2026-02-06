# Quick Deployment Checklist

A condensed checklist for deploying to production. See `DEPLOYMENT.md` for detailed instructions.

## 🚀 Quick Steps

### 1. Supabase Setup (5 min)
- [ ] Create Supabase project
- [ ] Copy credentials (URL, anon key, service role key)
- [ ] Get database connection string (use **Session mode**, port 6543)
- [ ] Push schema: `npx prisma db push --skip-generate` (with production DATABASE_URL)

### 2. Vercel Deployment (5 min)
- [ ] Push code to GitHub
- [ ] Import repo in Vercel
- [ ] Add environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  DATABASE_URL=... (Session mode, port 6543)
  NEXTAUTH_URL=https://your-app.vercel.app
  CRON_SECRET=... (generate with: openssl rand -base64 32)
  ```
- [ ] Deploy

### 3. Create Admin User (2 min)
- [ ] Create user in Supabase Auth (Dashboard → Authentication → Users)
- [ ] Create User record in database (SQL Editor or via app)

### 4. Verify (2 min)
- [ ] Log in at production URL
- [ ] Test creating a vacation request
- [ ] Test approval flow

## ⚠️ Important Notes

1. **Database Connection**: Always use **Session mode** connection string (port 6543) for production
2. **CRON_SECRET**: Required for production - protects cron endpoint
3. **NEXTAUTH_URL**: Must match your production domain exactly
4. **Vercel Cron**: Free tier has limitations - may need external cron service

## 🔧 Generate CRON_SECRET

```bash
# macOS/Linux
openssl rand -base64 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📝 Environment Variables Template

Copy this to Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
NEXTAUTH_URL=https://[your-app].vercel.app
CRON_SECRET=[generated-secret]
```

## 🐛 Common Issues

**Build fails**: Check `postinstall` script includes `prisma generate`

**Database connection error**: Use Session mode connection string (port 6543)

**User not found**: Create User record in database after creating auth user

**Cron not working**: Vercel Cron requires Pro plan - use external service for free tier

## 📚 Full Guide

See `DEPLOYMENT.md` for comprehensive instructions.
