export async function uploadFacultyDocument(formData: FormData) {
  try {
    console.log('Sending upload request to API...');
    const res = await fetch('/api/faculty-documents', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error('Upload failed:', {
        status: res.status,
        statusText: res.statusText,
        error: data.error
      });
      throw new Error(data.error || 'Failed to upload document');
    }

    console.log('Upload response:', data);
    return data;
  } catch (error) {
    console.error('Error in uploadFacultyDocument:', error);
    throw error;
  }
}

export async function fetchFacultyDocuments(facultyId: number) {
  try {
    console.log('Sending request to fetch documents for faculty:', facultyId);
    const response = await fetch(`/api/faculty-documents?facultyId=${facultyId}`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      throw new Error(errorData.error || 'Failed to fetch documents');
    }

    const data = await response.json();
    console.log('Received documents data:', data);
    return data;
  } catch (error) {
    console.error('Error in fetchFacultyDocuments:', error);
    throw error;
  }
}