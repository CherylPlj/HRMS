// Helper functions for file URL handling
export const getDirectImageUrl = (url: string) => {
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view.*/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

export const isDocFile = (url: string) => {
  return /\.(docx?|DOCX?)$/i.test(url) || url.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || url.includes('application/msword');
};

export const getDirectDocUrl = (url: string) => {
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view.*/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
};

export const getGoogleDocsExportUrl = (url: string, format: 'pdf' | 'docx') => {
  const match = url.match(/https?:\/\/docs\.google\.com\/document\/d\/([\w-]+)\//);
  if (match && match[1]) {
    return `https://docs.google.com/document/d/${match[1]}/export?format=${format}`;
  }
  return url;
};

export const getDirectDriveUrl = (url: string) => {
  const match = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

export const isGoogleDoc = (url: string) => {
  return /https?:\/\/docs\.google\.com\/document\/d\//.test(url);
};

export const getGoogleDocExportUrl = (url: string, format: 'pdf' | 'docx') => {
  const match = url.match(/https?:\/\/docs\.google\.com\/document\/d\/([\w-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/document/d/${match[1]}/export?format=${format}`;
  }
  return url;
};

export const isPdfFile = (url: string) => {
  return /\.pdf$/i.test(url) || url.includes('application/pdf');
};

export const isImageFile = (url: string) => {
  return /\.(jpe?g|png|gif|bmp|webp)$/i.test(url) || url.includes('image/');
};

export const getFileType = (url: string | undefined, mimeType?: string): 'image' | 'pdf' | 'other' => {
  if (!url) return 'other';
  
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
  }
  
  const extension = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
  if (extension === 'pdf') return 'pdf';
  return 'other';
};

export const getViewUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  
  const downloadMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (downloadMatch) {
    const fileId = downloadMatch[1];
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  
  return url;
};

export const getDownloadUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
    const urlMatch = url.match(/\/documents\/(.+)$/);
    if (urlMatch && urlMatch[1]) {
      const filePath = urlMatch[1];
      return `/api/documents/${encodeURIComponent(filePath)}?download=true`;
    }
  }
  
  return url;
};

export const getPreviewUrl = (url: string | undefined) => {
  if (!url) return '';
  
  if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
    const fileType = getFileType(url);
    if (fileType === 'pdf') {
      const urlMatch = url.match(/\/documents\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const filePath = urlMatch[1];
        return `/api/documents/${encodeURIComponent(filePath)}`;
      }
    }
    if (fileType === 'image') {
      return url;
    }
  }
  
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  const downloadMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (downloadMatch) {
    const fileId = downloadMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  return url;
};

export const validateDocTypeName = (value: string) => {
  if (!value.trim()) {
    return 'Document type name is required.';
  }
  if (value.length < 3) {
    return 'Document type name must be at least 3 characters long.';
  }
  if (value.length > 50) {
    return 'Document type name must not exceed 50 characters.';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
    return 'Only letters, numbers, spaces, hyphens, and underscores are allowed.';
  }
  if (/(.)\1{3,}/.test(value.replace(/ /g, ''))) {
    return 'No more than three repeated characters or symbols in a row.';
  }
  return null;
};

export const getStatusOrder = (status: string) => {
  switch (status) {
    case 'Submitted': return 1;
    case 'Returned': return 2;
    case 'Approved': return 3;
    default: return 4;
  }
};

