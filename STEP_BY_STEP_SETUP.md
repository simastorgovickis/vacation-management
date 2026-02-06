# Step-by-Step Setup Guide

## Step 1: Get the Session Pooler Connection String

1. Go back to the **"Connect to your project"** dialog (where you saw the connection string)
2. In the **Method** dropdown, change from **"Direct connection"** to **"Session"** (or **"Transaction"**)
3. Copy the new connection string that appears
   - It should look like: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
   - Or similar with `pooler.supabase.com` and port `6543`
4. Replace `[YOUR-PASSWORD]` with your password: `zoqqav-syrves-Gubta7`

**Alternative:** If you don't see the Session option, click **"Pooler settings"** button in the IPv4 warning box to get the pooler connection string.

## Step 2: Update .env File

Once you have the Session Pooler connection string, share it with me and I'll update your `.env` file automatically.

Or you can manually update it:
- Open `.env` file
- Replace the `DATABASE_URL` line with your Session Pooler connection string

## Step 3: Push Database Schema

After updating the connection string, run:
```bash
npm run db:push
```

This will create all the necessary tables in your Supabase database.

## Step 4: Create Admin User

### 4a. Create Auth User in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: (choose a secure password)
   - **Auto Confirm User**: ✅ (check this box)
4. Click **"Create User"**
5. **Note the email** you used

### 4b. Create User Record in Database

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Paste this SQL (replace `admin@example.com` with the email you used above):

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

4. Click **"Run"** (or press Cmd+Enter)
5. You should see "Success. No rows returned"

## Step 5: Test the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to: http://localhost:3000

3. You should see the login page

4. Login with:
   - Email: The email you used in Step 4a
   - Password: The password you set in Step 4a

5. You should be redirected to the Admin Dashboard!

## Troubleshooting

### If `db:push` fails:
- Make sure you're using the **Session Pooler** connection string (port 6543), not Direct (port 5432)
- Check that your password doesn't have special characters that need URL encoding

### If login fails:
- Make sure you created BOTH:
  1. The auth user in Authentication → Users
  2. The User record in the database via SQL Editor
- The emails must match exactly

### If you see "User not found":
- Run the SQL query from Step 4b again
- Make sure the email matches exactly between Supabase Auth and the User table

## Next Steps After Setup

Once everything is working:
1. Create test employees and managers via the Admin Dashboard
2. Test the vacation request flow
3. Deploy to Vercel when ready
