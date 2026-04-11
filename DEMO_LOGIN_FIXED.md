# Demo Login Setup - COMPLETED ✅

## Issue Resolved
Login was failing with `admin@demo.com / password123` because the user credentials didn't exist in the database.

## Solution Applied
Created demo users with proper authentication:

### Demo Credentials via Backend
```bash
cd backend
node seed-demo-users.js
```

This creates:
- **Admin**: `admin@demo.com` / `password123`
- **Faculty**: `faculty1@demo.com` / `password123` (also faculty2, faculty3)
- **TA**: `ta1@demo.com` / `password123` (also ta2)
- **Student**: `student1@demo.com` / `password123` (also student2-5)

## Important: Role Parameter Required
When logging in via API, specify the `role` parameter:

```javascript
// POST /api/auth/login
{
  "email": "admin@demo.com",
  "password": "password123",
  "role": "admin"  // IMPORTANT: specify the role
}
```

If no role is provided, it defaults to `'student'` (this is by design since students are the default user type).

## Testing Login
Run these verification scripts:

```bash
# Test with admin role specified
node test-login-admin.js

# Test with default student role
node test-login.js

# Verify user exists
node verify-admin.js

# List all users
node check-login.js
```

## Database Schema Notes
The users table now contains:
- `id` (bigint, primary key)
- `email` (varchar, unique)
- `password_hash` (text) - NOT `password`
- `name` (text)
- `role` (enum: student|faculty|ta|admin)
- `is_active` (boolean)
- Other fields: department_id, roll_number, etc.

## What Worked
✅ Database connection verified
✅ Demo users created with bcrypt-hashed passwords
✅ Authentication logic working correctly
✅ Roles properly assigned
✅ Login endpoint returning proper JWT tokens

## Next Steps
1. Update frontend login form to send `role` parameter
2. Ensure frontend knows which role to send based on user type
3. Set up remaining demo data (courses, assignments, etc.) via fixed seed script
4. Run full test suite to verify all 285+ tests pass

## Known Issue to Fix
The seed-all-features.js script has database schema mismatches. It needs to be updated to match the actual table structure:
- `courses` table uses different column names than expected
- Similar issues may exist in other tables

## Files Modified
- [backend/scripts/seed-all-features.js](../../backend/scripts/seed-all-features.js) - Fixed password column names (password → password_hash)
- Created: [backend/seed-demo-users.js](../../backend/seed-demo-users.js) - Simple user creation script
