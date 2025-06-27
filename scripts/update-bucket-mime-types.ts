import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function updateBucketMimeTypes() {
  try {
    console.log('Updating allowed MIME types for documents bucket...');

    const { error } = await supabaseAdmin.storage
      .updateBucket('documents', {  
        public: true,  // keep existing public setting
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