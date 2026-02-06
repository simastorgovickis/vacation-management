# Missing Credentials

I've updated your `.env` file with:
- ✅ Project URL
- ✅ Anon/Publishable Key

## Still Need:

### 1. Service Role Key (Secret Key)
**Where to find it:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz
2. Click **Settings** (gear icon) → **API**
3. Look for **"service_role"** key (NOT the anon key)
4. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)
5. Copy it and replace `your_supabase_service_role_key` in `.env`

⚠️ **Important**: This is a SECRET key - never commit it to git or share it publicly!

### 2. Database Connection String
**Where to find it:**
1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll down to **"Connection string"** section
3. Select **"URI"** tab
4. Copy the connection string
5. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.ehfomtbsbsqoxhnjzwcz.supabase.co:5432/postgres`
6. Replace `[YOUR-PASSWORD]` with your actual database password (the one you set when creating the project)
7. Replace the `DATABASE_URL` in `.env`

**Alternative**: If you don't remember your password, you can:
- Reset it in Settings → Database → Database password
- Or use the connection pooling URL (recommended for serverless)

## Once You Have Both:

1. Update `.env` with the service role key and database URL
2. Run: `npm run db:push` to create the database tables
3. Create your admin user (see SETUP.md Step 5)
4. Run: `npm run dev` to start the app
