import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function checkDatabaseSetup() {
    console.log('🔍 Checking Supabase database setup...');

    try {
        // Check if required tables exist
        const requiredTables = ['User', 'Role', 'UserRole'];
        
        for (const tableName of requiredTables) {
            try {
                const { data, error } = await supabaseAdmin
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    console.error(`❌ Table ${tableName} is not accessible:`, error.message);
                    return false;
                }
                
                console.log(`✅ Table ${tableName} is accessible`);
            } catch (err) {
                console.error(`❌ Table ${tableName} does not exist or is not accessible`);
                return false;
            }
        }

        console.log('✅ All required tables are accessible');
        return true;
    } catch (error) {
        console.error('❌ Database setup check failed:', error);
        return false;
    }
}

async function main() {
    console.log('🚀 Supabase Database Setup Check');
    console.log('================================');

    const isReady = await checkDatabaseSetup();

    if (isReady) {
        console.log('\n✅ Database is ready for seeding!');
        console.log('You can now run: npm run seed:supabase');
    } else {
        console.log('\n❌ Database setup issues detected.');
        console.log('\nTo fix this:');
        console.log('1. Ensure your Supabase project is active');
        console.log('2. Run your Prisma migrations: npx prisma migrate deploy');
        console.log('3. Check your environment variables in .env.local');
        console.log('4. Verify your service role key has the necessary permissions');
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error('Setup check failed:', e);
        process.exit(1);
    }); 