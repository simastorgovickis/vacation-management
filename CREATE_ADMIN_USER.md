# Create Admin User - Quick Guide

## Step 1: Create Auth User in Supabase

1. Go to: https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz/auth/users
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email**: `admin@example.com` (or your preferred email)
   - **Password**: Choose a secure password
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (important!)
4. Click **"Create User"**
5. **Remember the email and password** you used!

## Step 2: Create User Record in Database

1. Go to: https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz/sql/new
2. Click **"New query"** (if needed)
3. Copy and paste this SQL:

```sql
INSERT INTO "User" (id, email, name, role, "employmentDate", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',  -- ⚠️ REPLACE with the email you used in Step 1
  'Admin User',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

4. **IMPORTANT**: Replace `'admin@example.com'` with the **exact email** you used in Step 1
5. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
6. You should see: "Success. No rows returned"

## Step 3: Test Login

1. Start the app:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:3000

3. Login with:
   - Email: The email from Step 1
   - Password: The password from Step 1

4. You should be redirected to the Admin Dashboard! 🎉

## Troubleshooting

**"User not found" error:**
- Make sure you created BOTH:
  1. Auth user (Step 1) ✅
  2. User record (Step 2) ✅
- The emails must match **exactly** (case-sensitive)

**"Unauthorized" error:**
- Make sure you checked "Auto Confirm User" in Step 1
- Try logging out and back in

**Can't see SQL Editor:**
- Make sure you're in the Supabase Dashboard
- Look for "SQL Editor" in the left sidebar
