# Finding Connection String in Supabase

## Option 1: Check Infrastructure Section

1. Click **"Infrastructure"** in the Settings sidebar
2. Look for "Connection string" or "Database connection" section
3. Find "Session mode" connection string

## Option 2: Use What We Already Have

Since we already have your connection string from `.env`, we can just update the port!

**Your current connection string** (from .env):
```
postgresql://postgres.ehfomtbsbsqoxhnjzwcz:zoqqav-syrves-Gubta7@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**For production (Session mode)**, change port **5432** to **6543**:
```
postgresql://postgres.ehfomtbsbsqoxhnjzwcz:zoqqav-syrves-Gubta7@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

That's it! The only difference is the port number.

## Option 3: Direct Link

Try this direct link to Database settings:
https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz/settings/database

---

**Recommendation**: Since we already have the connection string format, let's just use Option 2 and change the port to 6543. This will work perfectly for production!
