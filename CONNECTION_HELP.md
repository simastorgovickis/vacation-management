# Database Connection Help

The direct database connection isn't working. Supabase often requires connection pooling for external connections.

## Get the Correct Connection String

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz
2. Click **Settings** → **Database**
3. Scroll to **"Connection string"** section
4. Select the **"URI"** tab
5. You'll see connection strings - use the one that says **"Session"** or **"Transaction"** mode (for connection pooling)
6. It should look like one of these formats:
   - `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
   - Or similar with `pooler.supabase.com` and port `6543`

## Alternative: Use Direct Connection with Pooler

If you see connection pooling URLs, use those instead. They're better for serverless/Next.js apps anyway.

## What to Do

Copy the **exact** connection string from Supabase Dashboard (Settings → Database → Connection string → URI tab) and share it with me. Make sure it includes your password already filled in, or I can replace `[YOUR-PASSWORD]` with your password.

The connection string should work with Prisma's `db push` command.
