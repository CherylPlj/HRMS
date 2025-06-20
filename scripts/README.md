# Supabase Seeding

This directory contains scripts for seeding your Supabase database with initial data.

## Prerequisites

Before running the seed script, make sure you have:

1. **Environment Variables Set Up**: Ensure your `.env.local` file contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Schema**: Make sure your Supabase database has the required tables:
   - `User`
   - `Role`
   - `UserRole`

3. **Dependencies Installed**: Run `npm install` to ensure all dependencies are available.

## Running the Seed Script

### Option 1: Using npm script (Recommended)
```bash
npm run seed:supabase
```

### Option 2: Direct execution
```bash
npx ts-node -r tsconfig-paths/register scripts/seed-supabase.ts
```

## What the Seed Script Does

The seed script will create the following users with their respective roles:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@admin.com | SJSFI@dmin1 | Admin | System administrator |
| faculty@faculty.com | SJSFIF@culty1 | Faculty | Faculty member |
| registrar@registrar.com | Registrar@SJSFI | Registrar | Registrar staff |
| cashier@cashier.com | Cashier@SJSFI | Cashier | Cashier staff |
| student@student.com | Student@SJSFI | Student | Student user |

## Features

- **Idempotent**: Can be run multiple times safely
- **Role Management**: Automatically creates roles if they don't exist
- **User Updates**: Updates existing users instead of creating duplicates
- **Error Handling**: Provides detailed error messages for troubleshooting
- **Password Hashing**: Uses the same hashing function as your application

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   ```
   Error: Missing Supabase URL. Please add NEXT_PUBLIC_SUPABASE_URL to your .env.local file
   ```
   - Solution: Check your `.env.local` file and ensure the Supabase URL and service role key are set correctly.

2. **Database Connection Issues**
   ```
   Error: Failed to create user admin@admin.com: connection error
   ```
   - Solution: Verify your Supabase URL and service role key are correct.
   - Check if your Supabase project is active and accessible.

3. **Schema Issues**
   ```
   Error: relation "User" does not exist
   ```
   - Solution: Ensure your database schema is properly migrated.
   - Run your Prisma migrations: `npx prisma migrate deploy`

4. **Permission Issues**
   ```
   Error: permission denied for table User
   ```
   - Solution: Ensure you're using the service role key (not the anon key).
   - Check that your service role has the necessary permissions.

### Debug Mode

To see more detailed logging, you can modify the script to include additional console.log statements or run it with Node.js debug flags:

```bash
NODE_ENV=development npm run seed:supabase
```

## Security Notes

- The service role key has full database access. Keep it secure and never expose it in client-side code.
- The seed script uses the same password hashing as your application for consistency.
- Consider changing the default passwords after the initial setup for production use.

## Customization

To add more users or modify the seeding logic:

1. Edit the `users` array in `scripts/seed-supabase.ts`
2. Add new user objects with the required fields
3. Run the seed script again

The script will handle creating new users and updating existing ones automatically. 