# Flatfinder Database Setup Guide

## Overview
This guide walks you through setting up the Flatfinder database schema on Supabase with users, apartments, and matches tables, complete with RLS policies and test data.

## Prerequisites
- Supabase account (free tier is sufficient)
- Supabase CLI installed: `brew install supabase/tap/supabase` (macOS) or see [Supabase CLI docs](https://supabase.com/docs/guides/cli)
- Git

## Quick Start

### Option 1: Using Supabase Dashboard (Recommended for First-Time Setup)

1. **Create a New Supabase Project**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Enter project details:
     - Name: `flatfinder` (or your preferred name)
     - Database Password: Create a strong password and save it securely
     - Region: Choose closest to your location
     - Pricing Plan: Free tier is sufficient for testing

2. **Get Your Connection Details**
   After project creation (takes ~2 minutes), go to Project Settings > API:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon/Public Key**: `eyJ...` (starts with eyJ)
   - **Service Role Key**: `eyJ...` (keep this secret!)

3. **Run the Migration**
   ```bash
   # Navigate to your project directory
   cd /home/user/agent-platform

   # Link your local project to Supabase
   supabase link --project-ref your-project-ref

   # Push the migrations to your Supabase project
   supabase db push
   ```

4. **Seed the Database**
   In the Supabase Dashboard:
   - Go to SQL Editor
   - Click "New Query"
   - Copy the contents of `supabase/seed.sql`
   - Click "Run"

### Option 2: Using Supabase CLI (Advanced)

```bash
# Initialize Supabase in your project
supabase init

# Start local Supabase instance
supabase start

# This will output connection details:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Anon key: eyJ...
# - Service role key: eyJ...

# Apply migrations
supabase db reset

# The seed.sql file will automatically run
```

## Database Schema

### Tables

#### 1. **users**
Extended user profiles with apartment search preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (references auth.users) |
| email | text | User email (unique) |
| full_name | text | User's full name |
| phone | text | Contact phone number |
| min_budget | numeric | Minimum monthly rent budget |
| max_budget | numeric | Maximum monthly rent budget |
| preferred_location | text | Preferred city/neighborhood |
| preferred_rooms | integer | Desired number of rooms |
| preferred_size_sqm | numeric | Desired apartment size in sqm |
| move_in_date | date | Desired move-in date |
| created_at | timestamptz | Record creation timestamp |
| updated_at | timestamptz | Record update timestamp |

#### 2. **apartments**
Apartment listings with detailed property information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Listing title |
| description | text | Detailed description |
| address | text | Street address |
| city | text | City name |
| postal_code | text | Postal code |
| country | text | Country (default: Germany) |
| rooms | numeric | Number of rooms |
| size_sqm | numeric | Size in square meters |
| floor | integer | Floor number |
| total_floors | integer | Total floors in building |
| rent_monthly | numeric | Monthly rent (cold) |
| utilities_monthly | numeric | Utilities cost |
| deposit | numeric | Security deposit |
| available_from | date | Availability date |
| is_available | boolean | Availability status |
| features | jsonb | Property features (JSON) |
| images | text[] | Array of image URLs |
| documents | text[] | Array of document URLs |
| source_url | text | Original listing URL |
| external_id | text | External listing ID |
| created_at | timestamptz | Record creation timestamp |
| updated_at | timestamptz | Record update timestamp |
| created_by | uuid | User who created listing |

#### 3. **matches**
User-apartment matches with scoring and status tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to users table |
| apartment_id | uuid | Reference to apartments table |
| match_score | numeric | Match score (0.0 - 1.0) |
| match_reasons | jsonb | Match criteria breakdown (JSON) |
| status | text | Match status (pending, interested, not_interested, contacted, viewed) |
| user_notes | text | User's notes about the match |
| contacted_at | timestamptz | When landlord was contacted |
| viewing_scheduled_at | timestamptz | Scheduled viewing time |
| created_at | timestamptz | Record creation timestamp |
| updated_at | timestamptz | Record update timestamp |

### Helper Functions

#### `calculate_match_score(user_uuid, apartment_uuid)`
Calculates a match score (0.0 - 1.0) based on user preferences:
- Budget match: 40% weight
- Location match: 30% weight
- Rooms match: 20% weight
- Size match: 10% weight

```sql
SELECT calculate_match_score(
  '11111111-1111-1111-1111-111111111111',
  'apartment-uuid-here'
);
```

#### `get_user_matches(user_uuid)`
Returns all matches for a user with apartment details.

```sql
SELECT * FROM get_user_matches('11111111-1111-1111-1111-111111111111');
```

## Row-Level Security (RLS)

All tables have RLS enabled with the following policies:

### Users Table
- ✅ Users can view their own data
- ✅ Users can insert their own data
- ✅ Users can update their own data

### Apartments Table
- ✅ Anyone can view available apartments
- ✅ Authenticated users can view all apartments
- ✅ Authenticated users can insert apartments
- ✅ Users can update their own apartments

### Matches Table
- ✅ Users can view their own matches
- ✅ Users can insert their own matches
- ✅ Users can update their own matches
- ✅ Users can delete their own matches

## Testing the Database

### 1. Test User Authentication
```sql
-- In Supabase Dashboard > SQL Editor
-- Create test users (use the Authentication > Users interface instead)
-- Or use the seed data UUIDs for testing
```

### 2. Query Sample Data
```sql
-- Get all apartments in Berlin
SELECT * FROM apartments WHERE city = 'Berlin';

-- Get user preferences
SELECT * FROM users WHERE id = '11111111-1111-1111-1111-111111111111';

-- Get matches for a user
SELECT * FROM get_user_matches('11111111-1111-1111-1111-111111111111');

-- Calculate match score
SELECT
  a.title,
  calculate_match_score('11111111-1111-1111-1111-111111111111', a.id) as score
FROM apartments a
ORDER BY score DESC;
```

### 3. Test RLS Policies
```sql
-- Test as authenticated user
-- The RLS policies will automatically filter results based on auth.uid()
```

## Connection Details

### After Setup, Save These Details:

**Supabase Project**
- Project Name: `flatfinder`
- Project URL: `https://[your-project-ref].supabase.co`
- Region: [Your selected region]

**API Keys** (from Project Settings > API)
- Anon Key (Public): `eyJ...`
  - Use in frontend applications
  - Safe to expose in client-side code

- Service Role Key (Secret): `eyJ...`
  - Use in backend services only
  - Never expose in client-side code

**Database Connection**
- Host: `db.[your-project-ref].supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: [Your database password]

**Connection String**
```
postgresql://postgres:[PASSWORD]@db.[your-project-ref].supabase.co:5432/postgres
```

### Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Direct Database Connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[your-project-ref].supabase.co:5432/postgres
```

Add these to your `frontend/.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Dummy Data

The seed file creates:

### Test Users (3)
1. **Alice Schmidt** - Looking for 2-room in Berlin (800-1200 EUR)
2. **Bob Mueller** - Looking for 3-room in Munich (1000-1500 EUR)
3. **Clara Weber** - Looking for 1-room in Hamburg (600-900 EUR)

### Sample Apartments (8)
- 3 apartments in Berlin
- 2 apartments in Munich
- 2 apartments in Hamburg
- Range: 1-4 rooms, 650-2200 EUR/month

### Auto-Generated Matches
Matches are automatically created for all users based on their preferences using the `calculate_match_score` function.

## Next Steps

1. **Test API Endpoints**
   - Create FastAPI endpoints in `backend/app/api/`
   - Use Supabase Python client to interact with the database

2. **Build Frontend**
   - Create Next.js pages for browsing apartments
   - Implement user profile management
   - Show matched apartments

3. **Add Authentication**
   - Configure Supabase Auth providers
   - Implement login/signup flows
   - See `AuthSetup.md` for details

4. **Implement Matching Algorithm**
   - Enhance the `calculate_match_score` function
   - Add more sophisticated matching criteria
   - Implement ML-based recommendations

## Troubleshooting

### Migration Fails
```bash
# Reset local database
supabase db reset

# Check migration status
supabase migration list

# Repair migrations
supabase migration repair [timestamp]
```

### RLS Policy Issues
- Ensure you're authenticated when testing
- Check if `auth.uid()` matches the user_id in the data
- Test policies in SQL Editor with `set local role authenticated;`

### Seed Data Not Inserted
- Check if migrations ran successfully first
- Ensure UUIDs don't conflict with existing auth.users
- Run seed.sql manually in SQL Editor

## Support

For issues:
- Check [Supabase Documentation](https://supabase.com/docs)
- Review migration files in `supabase/migrations/`
- Check Supabase project logs in Dashboard

## Migration Files

- `20240327000000_initial_schema.sql` - Original boilerplate schema
- `20251105180331_flatfinder_schema.sql` - Flatfinder tables and RLS policies
- `seed.sql` - Test data

---

**Setup Complete! 🎉**

Your Flatfinder database is ready to use. You now have:
- ✅ Users, apartments, and matches tables
- ✅ Row-level security policies
- ✅ Helper functions for matching
- ✅ Test data with 3 users, 8 apartments, and auto-generated matches
