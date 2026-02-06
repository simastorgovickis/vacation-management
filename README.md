# Employee Vacation Management System

A production-ready vacation management web application built with Next.js, TypeScript, Supabase, and Prisma.

## Features

- **Role-Based Access Control**: Admin, Manager, and Employee roles with appropriate permissions
- **Vacation Request Flow**: Submit, approve, reject, and cancel vacation requests
- **Monthly Accrual**: Automatic monthly vacation day accumulation (20 days/year = 1.6667 days/month)
- **Calendar View**: Visual calendar showing vacation schedules
- **Dashboard**: Role-specific dashboards with relevant information
- **Audit Logging**: Track all administrative actions
- **Balance Management**: Admins can manually adjust vacation balances

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **ORM**: Prisma
- **Calendar**: FullCalendar
- **Hosting**: Vercel (with cron jobs)

## Prerequisites

- Node.js 18+ (you have v25.2.1 ✓)
- A Supabase account (free tier)
- A Vercel account (free tier)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd vacation-management
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to **Settings** → **API** and copy:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`) - Keep this secret!
4. Go to **Settings** → **Database** and copy the connection string (`DATABASE_URL`)

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
NEXTAUTH_URL=http://localhost:3000
```

### 4. Set Up Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

This will create all the necessary tables in your Supabase database.

### 5. Create Your First Admin User

You'll need to create an admin user manually. You can do this via:

**Option A: Using Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Note the email address

**Option B: Using SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace with your email and password):

```sql
-- First, create the auth user (you'll need to use Supabase Auth API or Dashboard for this)
-- Then insert into your users table:

INSERT INTO "User" (id, email, name, role, "employmentDate", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'Admin User',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

**Option C: Create via API after first login**
- After creating a user in Supabase Auth, you can create the corresponding User record via the admin panel once you're logged in.

### 6. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Deploy to Vercel

**Quick Start**: See `DEPLOYMENT_QUICKSTART.md` for a condensed checklist.

**Full Guide**: See `DEPLOYMENT.md` for comprehensive production deployment instructions.

**Basic Steps**:
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add all environment variables from your `.env` file (including `CRON_SECRET`)
4. Deploy!

The cron job for monthly accrual will be automatically set up via `vercel.json`.

**Important**: 
- Use **Session mode** database connection string (port 6543) for production
- Generate and set `CRON_SECRET` environment variable
- Update `NEXTAUTH_URL` to your production domain after first deployment

## User Roles & Permissions

### ADMIN
- Create and manage users
- Assign employees to managers
- View all vacations
- Manually adjust vacation balances
- View audit logs

### MANAGER
- View team members' vacations
- Approve/reject vacation requests
- See team member balances
- Add comments when approving/rejecting

### EMPLOYEE
- View own vacations
- Request new vacations
- See approval status
- View available, used, and remaining vacation days

## Vacation Rules

- **Default Allowance**: 20 days per year
- **Accrual Rate**: 1.6667 days per month (20/12)
- **Accrual Start**: From employment start date
- **Fractional Days**: Supported (can request partial days)
- **Manual Adjustments**: Admins can add/subtract days with reason

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Vacations
- `GET /api/vacations` - List vacations (filtered by role)
- `POST /api/vacations` - Create vacation request
- `GET /api/vacations/[id]` - Get vacation details
- `PATCH /api/vacations/[id]` - Update vacation (approve/reject/cancel)

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/[id]` - Update user

### Balances
- `GET /api/balances/[userId]` - Get vacation balance
- `PATCH /api/balances/[userId]` - Adjust balance (Admin only)

### Cron
- `GET /api/cron/monthly-accrual` - Process monthly accrual (called by Vercel Cron)

## Database Schema

The application uses the following main models:

- **User**: Users with roles (ADMIN, MANAGER, EMPLOYEE)
- **ManagerEmployee**: Manager-employee relationships
- **VacationRequest**: Vacation requests with status
- **VacationBalance**: Yearly vacation balances
- **VacationAccrualLog**: Monthly accrual records
- **AuditLog**: Administrative action logs

## Development

```bash
# Run development server
npm run dev

# Generate Prisma Client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Run migrations (for production)
npm run db:migrate
```

## Monthly Accrual Cron Job

The application includes a cron job that runs monthly to accrue vacation days. This is configured in `vercel.json`:

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

This runs at midnight on the 1st of every month.

## Security Notes

- All API routes enforce role-based access control
- Users can only access data they're authorized to see
- Admin actions are logged in the audit log
- Supabase handles authentication securely
- Environment variables should never be committed

## Troubleshooting

### "Prisma Client not generated"
Run `npm run db:generate`

### "Database connection error"
Check your `DATABASE_URL` in `.env` matches your Supabase connection string

### "Authentication not working"
Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

### "User not found after login"
Make sure you've created a corresponding User record in the database after creating the auth user

## License

MIT
