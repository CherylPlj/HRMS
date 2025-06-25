import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Readable } from 'stream';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.metadata'
];

class GoogleDriveService {
  private auth: JWT;
  private drive: any;
  private rootFolderId: string;

  constructor() {
    if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PRIVATE_KEY || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('Missing required Google Drive credentials');
    }

    this.auth = new JWT({
      email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      key: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  // Create a folder for a specific user
  private async createUserFolder(userId: string, userName: string): Promise<string> {
    try {
      // Check if folder already exists
      const existingFolder = await this.drive.files.list({
        q: `name='${userName}' and mimeType='application/vnd.google-apps.folder' and '${this.rootFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
      });

      if (existingFolder.data.files && existingFolder.data.files.length > 0) {
        return existingFolder.data.files[0].id;
      }

      // Create new folder if it doesn't exist
      const folderMetadata = {
        name: userName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.rootFolderId],
        properties: {
          userId: userId
        }
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating user folder:', error);
      throw new Error('Failed to create user folder');
    }
  }

  // Get or create user folder
  private async getUserFolder(userId: string, userName: string): Promise<string> {
    try {
      // First try to find existing folder
      const existingFolder = await this.drive.files.list({
        q: `properties has { key='userId' and value='${userId}' } and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (existingFolder.data.files && existingFolder.data.files.length > 0) {
        return existingFolder.data.files[0].id;
      }

      // If no folder found, create a new one
      return await this.createUserFolder(userId, userName);
    } catch (error) {
      console.error('Error getting user folder:', error);
      throw new Error('Failed to get user folder');
    }
  }

  // Upload file to user's folder
  async uploadFile(file: Buffer, fileName: string, mimeType: string, userId: string, userName: string): Promise<{ fileId: string; webViewLink: string; downloadUrl: string }> {
    try {
      // Get or create user folder
      const userFolderId = await this.getUserFolder(userId, userName);

      const fileMetadata = {
        name: fileName,
        parents: [userFolderId],
        properties: {
          userId: userId,
          uploadDate: new Date().toISOString()
        }
      };

      const media = {
        mimeType: mimeType,
        body: file,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      // Set file permissions to allow anyone with the link to view
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the download URL
      const fileDetails = await this.drive.files.get({
        fileId: response.data.id,
        fields: 'webContentLink',
      });

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        downloadUrl: fileDetails.data.webContentLink,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  // List files in user's folder
  async listUserFiles(userId: string): Promise<any[]> {
    try {
      const userFolder = await this.drive.files.list({
        q: `properties has { key='userId' and value='${userId}' } and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!userFolder.data.files || userFolder.data.files.length === 0) {
        return [];
      }

      const userFolderId = userFolder.data.files[0].id;
      const files = await this.drive.files.list({
        q: `'${userFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime, properties)',
      });

      return files.data.files;
    } catch (error) {
      console.error('Error listing user files:', error);
      throw new Error('Failed to list user files');
    }
  }
}

interface UploadFileParams {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

interface UploadFileResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadFileToDrive({
  fileName,
  mimeType,
  fileBuffer,
}: UploadFileParams): Promise<UploadFileResult> {
  try {
    // Convert buffer to readable stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Upload file to Google Drive
    const response = await google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    }) }).files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID_RESUME!], // Folder where resumes will be stored
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    if (!response.data.id || !response.data.webViewLink) {
      throw new Error('Failed to get file ID or web view link');
    }

    // Make the file viewable by anyone with the link
    await google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    }) }).permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

export const googleDriveService = new GoogleDriveService(); 