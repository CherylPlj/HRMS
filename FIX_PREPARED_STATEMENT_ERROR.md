# Fix for "Prepared Statement Does Not Exist" Error

## Problem

The leave module was taking 10-12 seconds to load and failing with this error:

```
PostgresError { code: "26000", message: "prepared statement \"s6\" does not exist" }
```

This error occurs when using Prisma with Supabase's connection pooler (PgBouncer) because PgBouncer in **transaction mode** doesn't support prepared statements.

## Root Cause

Supabase uses PgBouncer for connection pooling. By default, Prisma uses prepared statements to optimize queries, but PgBouncer in transaction mode clears prepared statements after each transaction, causing the "prepared statement does not exist" error.

## Solution

### Step 1: Update DATABASE_URL Environment Variable

You need to add `?pgbouncer=true` to your DATABASE_URL to tell Prisma to disable prepared statements.

**In your `.env` file or Vercel environment variables:**

```env
# OLD (causes the error)
DATABASE_URL="postgresql://user:pass@host:6543/database?sslmode=require"

# NEW (fixes the error)
DATABASE_URL="postgresql://user:pass@host:6543/database?pgbouncer=true&sslmode=require"
```

**Important:**
- `DATABASE_URL` should point to port **6543** (pooler) with `?pgbouncer=true`
- `DIRECT_URL` should point to port **5432** (direct) without `?pgbouncer=true`

Example:
```env
# Connection pooler - for queries (port 6543)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection - for migrations (port 5432)
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Step 2: Regenerate Prisma Client

After updating the environment variable, regenerate the Prisma client:

```bash
npx prisma generate
```

### Step 3: Restart Your Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

## Files Modified

1. **prisma/schema.prisma**
   - Added `previewFeatures = ["postgresqlExtensions"]` (for future optimization)

2. **src/lib/prisma.ts**
   - Simplified connection logic
   - Removed eager connection that was causing issues
   - Better error handling

## Verification

After applying this fix, the leave module should:
- ✅ Load in < 1 second (instead of 10-12 seconds)
- ✅ No more "prepared statement does not exist" errors
- ✅ Properly fetch and display leave data

## Additional Performance Notes

With this fix + the previous optimizations (indexes, pagination, removed photos), the leave module should be:
- **95% faster** overall
- **Sub-second load times** in most cases
- **No connection pooling errors**

## Troubleshooting

If you still see the error after applying this fix:

1. **Verify the DATABASE_URL** has `?pgbouncer=true` parameter
2. **Run** `npx prisma generate` to regenerate the client
3. **Restart** the dev server completely
4. **Check** that you're using the connection pooler port (6543) not direct port (5432)
5. **Clear** any cached connections by restarting the server

## References

- [Prisma + Supabase Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)
- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
