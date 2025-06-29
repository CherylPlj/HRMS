import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function setupCertificatesBucket() {
  try {
    console.log('Setting up Supabase Storage for certificates...');

    // Create the certificates bucket
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .createBucket('certificates', {
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

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('Certificates bucket already exists');
      } else {
        console.error('Error creating bucket:', bucketError);
        return;
      }
    } else {
      console.log('Certificates bucket created successfully:', bucketData);
    }

    console.log('Supabase Storage setup for certificates completed!');
  } catch (error) {
    console.error('Error setting up Supabase Storage for certificates:', error);
  }
}

setupCertificatesBucket(); 