const express = require('express');
const cors = require('cors');
const facultyDocuments = require('./faculty-documents');
const app = express();
app.use(cors());
app.use('/api/faculty-documents', facultyDocuments);

app.listen(5000, () => console.log('Server running on port 5000'));