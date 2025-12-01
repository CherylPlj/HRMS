import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function setupDisciplinaryEvidenceBucket() {
  try {
    console.log('Setting up Supabase Storage for disciplinary evidence...');

    // Create the disciplinary-evidence bucket
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .createBucket('disciplinary-evidence', {
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
          'image/webp',
          'image/bmp',
          'image/svg+xml',
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'audio/mpeg',
          'audio/wav',
          'application/zip',
          'application/x-zip-compressed',
        ],
        fileSizeLimit: 10485760 // 10MB limit
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists') || bucketError.message.includes('duplicate')) {
        console.log('✓ Disciplinary evidence bucket already exists');
      } else {
        console.error('✗ Error creating bucket:', bucketError);
        return;
      }
    } else {
      console.log('✓ Disciplinary evidence bucket created successfully:', bucketData);
    }

    console.log('✓ Supabase Storage setup for disciplinary evidence completed!');
  } catch (error) {
    console.error('✗ Error setting up Supabase Storage for disciplinary evidence:', error);
    throw error;
  }
}

setupDisciplinaryEvidenceBucket()
  .then(() => {
    console.log('Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });

