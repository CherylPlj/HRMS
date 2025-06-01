export async function uploadFacultyDocument(formData: FormData) {
  const res = await fetch('/api/faculty-documents', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return res.json();
}

export async function fetchFacultyDocuments(facultyId?: number) {
  const url = facultyId
    ? `/api/faculty-documents?facultyId=${facultyId}`
    : '/api/faculty-documents';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}