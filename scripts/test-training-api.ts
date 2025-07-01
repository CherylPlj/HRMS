async function testTrainingDocumentsAPI() {
  try {
    console.log('Testing training documents API...\n');

    // Test the training documents API
    const response = await fetch('http://localhost:3000/api/training-documents');
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`Training documents found: ${data.length}\n`);

    if (data.length === 0) {
      console.log('No training documents found.');
      return;
    }

    data.forEach((doc: any, index: number) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Title: ${doc.title}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  File URL: ${doc.fileUrl}`);
      console.log(`  Content Length: ${doc.content?.length || 0} characters`);
      console.log(`  Uploaded By: ${doc.uploadedBy}`);
      console.log(`  Uploaded At: ${doc.uploadedAt}`);
      console.log(`  File Type: ${doc.fileType}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testTrainingDocumentsAPI(); 