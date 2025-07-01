import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function setupTrainingDocsBucket() {
  try {
    console.log('Setting up Supabase Storage for training documents...');

    // Create the trainingdocs bucket
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .createBucket('trainingdocs', {
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
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        fileSizeLimit: 10485760 // 10MB limit
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('Trainingdocs bucket already exists');
      } else {
        console.error('Error creating bucket:', bucketError);
        return;
      }
    } else {
      console.log('Trainingdocs bucket created successfully:', bucketData);
    }

    console.log('Supabase Storage setup for training documents completed!');
  } catch (error) {
    console.error('Error setting up Supabase Storage for training documents:', error);
  }
}

setupTrainingDocsBucket(); 