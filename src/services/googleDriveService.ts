import { google } from 'googleapis';
import { Readable } from 'stream';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Initialize Google Drive client
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  downloadLink: string;
  storageType: 'google-drive' | 'supabase';
}

export const googleDriveService = {
  async uploadFile(
    file: File | Blob,
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<UploadResult> {
    try {
      // Convert File/Blob to stream
      const buffer = await file.arrayBuffer();
      const stream = new Readable();
      stream.push(Buffer.from(buffer));
      stream.push(null);

      // Prepare file metadata
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      };

      // Prepare media
      const media = {
        mimeType,
        body: stream,
      };

      console.log('Uploading file to Google Drive:', {
        fileName,
        mimeType,
        folderId,
      });

      // Upload file
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink',
      });

      if (!response.data.id) {
        throw new Error('Failed to upload file to Google Drive: No file ID returned');
      }

      console.log('File uploaded successfully to Google Drive:', response.data);

      // Make the file publicly accessible
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Make sure the service account has access
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        },
      });

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink || '',
        downloadLink: response.data.webContentLink || '',
        storageType: 'google-drive'
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      
      // Check if it's a storage quota error or any Google Drive error
      if (error instanceof Error && (
        error.message.includes('storage quota') || 
        error.message.includes('Service Accounts do not have storage quota')
      )) {
        console.warn('Google Drive storage quota exceeded. Trying Supabase Storage as fallback.');
        return await this.uploadToSupabase(file, fileName, mimeType);
      }
      
      if (error instanceof Error) {
        throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
      }
      throw new Error('Failed to upload file to Google Drive');
    }
  },

  async uploadToSupabase(
    file: File | Blob,
    fileName: string,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      console.log('Uploading file to Supabase Storage as fallback:', {
        fileName,
        mimeType,
      });

      // Convert File/Blob to buffer
      const buffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('resumes')
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        // If bucket doesn't exist, throw a specific error
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          throw new Error('SUPABASE_BUCKET_NOT_FOUND');
        }
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('resumes')
        .getPublicUrl(fileName);

      console.log('File uploaded successfully to Supabase Storage:', data);

      return {
        fileId: data.path, // Use the file path as ID
        webViewLink: urlData.publicUrl,
        downloadLink: urlData.publicUrl,
        storageType: 'supabase'
      };
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      throw new Error(`Failed to upload file to Supabase Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteFile(fileId: string, storageType: 'google-drive' | 'supabase' = 'google-drive'): Promise<void> {
    try {
      if (storageType === 'supabase') {
        // Delete from Supabase Storage
        const { error } = await supabaseAdmin.storage
          .from('resumes')
          .remove([fileId]);

        if (error) {
          throw new Error(`Supabase delete failed: ${error.message}`);
        }
      } else {
        // Delete from Google Drive
        await drive.files.delete({
          fileId,
        });
      }
    } catch (error) {
      console.error(`Error deleting file from ${storageType}:`, error);
      throw new Error(`Failed to delete file from ${storageType}`);
    }
  },

  async getFileMetadata(fileId: string, storageType: 'google-drive' | 'supabase' = 'google-drive') {
    try {
      if (storageType === 'supabase') {
        // Get metadata from Supabase Storage
        const { data, error } = await supabaseAdmin.storage
          .from('resumes')
          .list('', {
            search: fileId
          });

        if (error || !data || data.length === 0) {
          throw new Error('File not found in Supabase Storage');
        }

        const file = data[0];
        const { data: urlData } = supabaseAdmin.storage
          .from('resumes')
          .getPublicUrl(fileId);

        return {
          id: fileId,
          name: file.name,
          mimeType: file.metadata?.mimetype || 'application/octet-stream',
          webViewLink: urlData.publicUrl,
          webContentLink: urlData.publicUrl,
        };
      } else {
        // Get metadata from Google Drive
        const response = await drive.files.get({
          fileId,
          fields: 'id, name, mimeType, webViewLink, webContentLink',
        });
        return response.data;
      }
    } catch (error) {
      console.error(`Error getting file metadata from ${storageType}:`, error);
      throw new Error(`Failed to get file metadata from ${storageType}`);
    }
  },
}; 