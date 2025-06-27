const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function updateBucketMimeTypes() {
  try {
    console.log('Updating allowed MIME types for documents bucket...');

    const { error } = await supabaseAdmin.storage
      .updateBucket('documents', {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/rtf',
          'application/vnd.oasis.opendocument.text',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp'
        ],
        fileSizeLimit: 10485760 // 10MB limit
      });

    if (error) {
      console.error('Error updating bucket:', error);
      return;
    }

    console.log('Successfully updated bucket MIME types!');
  } catch (error) {
    console.error('Error updating bucket configuration:', error);
  }
}

updateBucketMimeTypes(); 