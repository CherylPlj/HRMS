import { google } from 'googleapis';
import { Readable } from 'stream';

// Initialize Google Drive client
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  downloadLink: string;
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

      console.log('File uploaded successfully:', response.data);

      // Make the file publicly accessible
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink || '',
        downloadLink: response.data.webContentLink || '',
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
      }
      throw new Error('Failed to upload file to Google Drive');
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      await drive.files.delete({
        fileId,
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  },

  async getFileMetadata(fileId: string) {
    try {
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata from Google Drive:', error);
      throw new Error('Failed to get file metadata from Google Drive');
    }
  },
}; 