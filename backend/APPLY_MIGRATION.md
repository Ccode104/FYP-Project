# Apply Migration to Make password_hash Nullable

## Problem
The database has a NOT NULL constraint on `password_hash`, but Google OAuth users don't have passwords. This migration removes that constraint.

## Solution

### Option 1: Using psql (PostgreSQL command line)

```bash
# Replace YOUR_DATABASE_URL with your actual database connection string
psql YOUR_DATABASE_URL -f prisma/migrations/make_password_hash_nullable.sql
```

Or if you have DATABASE_URL in your .env:
```bash
cd backend
psql $DATABASE_URL -f prisma/migrations/make_password_hash_nullable.sql
```

### Option 2: Using a database GUI tool (pgAdmin, DBeaver, etc.)

1. Open your database tool
2. Connect to your database
3. Open the file: `backend/prisma/migrations/make_password_hash_nullable.sql`
4. Execute the SQL script

### Option 3: Direct SQL command

Run this SQL directly in your database:

```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

### Verify the change

After running the migration, verify with:

```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'password_hash';
```

The `is_nullable` should be `YES`.

## After Migration

1. Restart your backend server
2. Try Google Sign-In again
3. It should work now!

