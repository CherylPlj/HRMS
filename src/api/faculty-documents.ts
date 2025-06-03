export async function uploadFacultyDocument(formData: FormData) {
  const res = await fetch('/api/faculty-documents', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return res.json();
}

export async function fetchFacultyDocuments(facultyId?: number) {
  try {
    const url = facultyId
      ? `/api/faculty-documents?facultyId=${facultyId}`
      : '/api/faculty-documents';
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch documents');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}