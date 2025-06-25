const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabaseStorage() {
  try {
    console.log('Setting up Supabase Storage for resumes...');

    // Create the resumes bucket
    const { data: bucketData, error: bucketError } = await supabase.storage
      .createBucket('resumes', {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/rtf',
          'application/vnd.oasis.opendocument.text'
        ],
        fileSizeLimit: 10485760 // 10MB limit
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('Resumes bucket already exists');
      } else {
        console.error('Error creating bucket:', bucketError);
        return;
      }
    } else {
      console.log('Resumes bucket created successfully:', bucketData);
    }

    console.log('Supabase Storage setup completed!');
  } catch (error) {
    console.error('Error setting up Supabase Storage:', error);
  }
}

setupSupabaseStorage(); 