import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface UploadEvidenceInput {
  disciplinaryRecordId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  description?: string;
  uploadedBy?: string;
}

export class DisciplinaryEvidenceService {
  private readonly EVIDENCE_BUCKET = 'disciplinary-evidence';

  /**
   * Upload evidence file to Supabase Storage
   */
  async uploadEvidenceFile(
    file: File | Blob,
    fileName: string,
    mimeType: string
  ): Promise<{ fileUrl: string; filePath: string }> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

      // Convert File/Blob to buffer
      const buffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.EVIDENCE_BUCKET)
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, try to create it or use fallback
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          throw new Error('EVIDENCE_BUCKET_NOT_FOUND');
        }
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      // Get public URL - ensure the path is properly encoded
      const { data: urlData } = supabaseAdmin.storage
        .from(this.EVIDENCE_BUCKET)
        .getPublicUrl(uploadData.path);

      // Ensure the URL is properly formatted
      const publicUrl = urlData.publicUrl;
      
      return {
        fileUrl: publicUrl,
        filePath: uploadData.path,
      };
    } catch (error) {
      console.error('Error uploading evidence file:', error);
      throw new Error(
        `Failed to upload evidence file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create evidence record in database
   */
  async createEvidence(input: UploadEvidenceInput) {
    const evidence = await prisma.disciplinaryEvidence.create({
      data: {
        disciplinaryRecordId: input.disciplinaryRecordId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        description: input.description,
        uploadedBy: input.uploadedBy,
      },
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
          },
        },
      },
    });

    return evidence;
  }

  /**
   * Get all evidence for a disciplinary record
   */
  async getEvidenceByRecordId(disciplinaryRecordId: string) {
    const evidence = await prisma.disciplinaryEvidence.findMany({
      where: { disciplinaryRecordId },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return evidence;
  }

  /**
   * Get a single evidence record by ID
   */
  async getEvidenceById(id: string) {
    const evidence = await prisma.disciplinaryEvidence.findUnique({
      where: { id },
      include: {
        disciplinaryRecord: {
          select: {
            id: true,
            caseNo: true,
            employee: {
              select: {
                EmployeeID: true,
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
      },
    });

    return evidence;
  }

  /**
   * Delete evidence record and file
   */
  async deleteEvidence(id: string) {
    // Get evidence record first to get file path
    const evidence = await prisma.disciplinaryEvidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Try to delete file from Supabase Storage first
    try {
      // Extract file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/disciplinary-evidence/[filename]
      let filePath: string;
      if (evidence.fileUrl.includes('/disciplinary-evidence/')) {
        // Extract path after the bucket name
        const urlParts = evidence.fileUrl.split('/disciplinary-evidence/');
        filePath = urlParts.length > 1 ? urlParts[1] : evidence.fileUrl.split('/').pop() || '';
        // Decode URL encoding if present
        filePath = decodeURIComponent(filePath);
      } else {
        // Fallback: assume it's just the filename
        filePath = evidence.fileUrl.split('/').pop() || evidence.fileUrl;
      }
      
      if (filePath) {
        await supabaseAdmin.storage.from(this.EVIDENCE_BUCKET).remove([filePath]);
      }
    } catch (error) {
      // Log error but don't fail if file deletion fails
      console.error('Error deleting evidence file from storage:', error);
    }

    // Delete from database (cascade will handle relationships)
    await prisma.disciplinaryEvidence.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Upload evidence file and create record in one operation
   */
  async uploadAndCreateEvidence(
    file: File | Blob,
    fileName: string,
    mimeType: string,
    disciplinaryRecordId: string,
    description?: string,
    uploadedBy?: string
  ) {
    // Upload file
    const { fileUrl, filePath } = await this.uploadEvidenceFile(file, fileName, mimeType);

    // Get file size
    const fileSize = file instanceof File ? file.size : (file as Blob).size;

    // Determine file type from extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileType = this.getFileTypeFromExtension(fileExtension);

    // Create evidence record
    const evidence = await this.createEvidence({
      disciplinaryRecordId,
      fileName,
      fileType,
      fileUrl,
      fileSize,
      description,
      uploadedBy,
    });

    return evidence;
  }

  /**
   * Get file type category from file extension
   */
  private getFileTypeFromExtension(extension: string): string {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const pdfExtensions = ['pdf'];
    const documentExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];

    if (imageExtensions.includes(extension)) {
      return 'image';
    }
    if (pdfExtensions.includes(extension)) {
      return 'pdf';
    }
    if (documentExtensions.includes(extension)) {
      return 'document';
    }
    return 'file';
  }
}

export const disciplinaryEvidenceService = new DisciplinaryEvidenceService();

