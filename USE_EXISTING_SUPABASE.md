# Using Existing Supabase Project

Great! You already have Supabase configured. Let's use it for production.

## Your Current Supabase Configuration

- **Project URL**: `https://ehfomtbsbsqoxhnjzwcz.supabase.co`
- **Project ID**: `ehfomtbsbsqoxhnjzwcz`
- **Region**: `eu-west-1` (Europe)

## For Production Deployment

You can use the **same Supabase project** for production, or create a separate one. Here are your options:

### Option A: Use Same Project (Development + Production)

**Pros:**
- ✅ Already configured
- ✅ Database schema already set up
- ✅ No need to migrate data
- ✅ Simpler setup

**Cons:**
- ⚠️ Development and production share the same database
- ⚠️ Test data might mix with production data

**Recommendation**: Fine for small teams or if you're careful with data.

### Option B: Create Separate Production Project (Recommended)

**Pros:**
- ✅ Clean separation between dev and prod
- ✅ Production data is isolated
- ✅ Can test deployments without affecting production

**Cons:**
- ⚠️ Need to set up new project
- ⚠️ Need to push schema again
- ⚠️ Need to migrate data if you have any

**Recommendation**: Better for production deployments.

---

## Next Steps

### If Using Existing Project (Option A):

1. **Verify Database Schema**: Make sure schema is up to date
   ```bash
   cd /Users/storgovickis/Cursor_root_folder/vacation-management
   npx prisma db push
   ```

2. **Use These Credentials for Vercel**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ehfomtbsbsqoxhnjzwcz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   DATABASE_URL=postgresql://postgres.ehfomtbsbsqoxhnjzwcz:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
   ```
   
   **Important**: For production, use **Session mode** connection string (port **6543**), not Transaction mode (port 5432).

### If Creating New Production Project (Option B):

Follow the steps in `NEXT_STEPS_SUPABASE.md` to create a new project.

---

## Get Session Mode Connection String

For production, you need the **Session mode** connection string:

1. Go to: https://supabase.com/dashboard/project/ehfomtbsbsqoxhnjzwcz
2. Click **Settings** → **Database**
3. Scroll to **Connection string** section
4. Click **"Session mode"** tab
5. Copy the connection string (should have port **6543**)
6. Replace `[YOUR-PASSWORD]` with your database password

---

**Which option do you prefer?** 

- **Option A**: Use existing project (faster, simpler)
- **Option B**: Create new production project (cleaner separation)

Let me know and we'll proceed accordingly!
