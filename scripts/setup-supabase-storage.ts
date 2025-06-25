import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function setupSupabaseStorage() {
  try {
    console.log('Setting up Supabase Storage for resumes...');

    // Create the resumes bucket
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
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

    // Set up RLS policies for the bucket
    const policies = [
      {
        name: 'Allow public read access to resumes',
        definition: 'SELECT',
        target: 'resumes',
        using: 'true'
      },
      {
        name: 'Allow authenticated users to upload resumes',
        definition: 'INSERT',
        target: 'resumes',
        using: 'auth.role() = \'authenticated\''
      },
      {
        name: 'Allow users to update their own resumes',
        definition: 'UPDATE',
        target: 'resumes',
        using: 'auth.role() = \'authenticated\''
      },
      {
        name: 'Allow users to delete their own resumes',
        definition: 'DELETE',
        target: 'resumes',
        using: 'auth.role() = \'authenticated\''
      }
    ];

    for (const policy of policies) {
      try {
        const { error: policyError } = await supabaseAdmin.rpc('create_policy', {
          policy_name: policy.name,
          table_name: policy.target,
          definition: policy.definition,
          using_clause: policy.using
        });

        if (policyError) {
          if (policyError.message.includes('already exists')) {
            console.log(`Policy ${policy.name} already exists`);
          } else {
            console.error(`Error creating policy ${policy.name}:`, policyError);
          }
        } else {
          console.log(`Policy ${policy.name} created successfully`);
        }
      } catch (error) {
        console.error(`Error setting up policy ${policy.name}:`, error);
      }
    }

    console.log('Supabase Storage setup completed!');
  } catch (error) {
    console.error('Error setting up Supabase Storage:', error);
  }
}

setupSupabaseStorage(); 