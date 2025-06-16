const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// --- Supabase setup ---
const supabaseUrl = 'NEXT_PUBLIC_SUPABASE_URL'; // <-- Replace with your Supabase URL
const supabaseKey = 'SUPABASE_SERVICE_ROLE_KEY'; // <-- Replace with your Supabase service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Multer setup for temp local upload ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- GET documents from Supabase ---
router.get('/', async (req, res) => {
  const { facultyId } = req.query;
  let query = supabase.from('Document').select('*');
  if (facultyId) {
    query = query.eq('FacultyID', facultyId);
  }
  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// --- POST upload to Supabase Storage and insert metadata ---
router.post('/', upload.single('file'), async (req, res) => {
  const { FacultyID, DocumentTypeID, SubmissionStatus } = req.body;
  if (!FacultyID || !DocumentTypeID || !SubmissionStatus || !req.file) {
    return res.status(400).json({ error: 'Missing required fields or file' });
  }

  // Upload file to Supabase Storage
  const filePath = `${Date.now()}-${req.file.originalname}`;
  const { error: uploadError } = await supabase.storage
    .from('documents') // Make sure you have a 'documents' bucket in Supabase Storage
    .upload(filePath, fs.createReadStream(req.file.path), {
      contentType: req.file.mimetype,
      upsert: false,
    });

  fs.unlinkSync(req.file.path);

  if (uploadError) {
    return res.status(500).json({ error: 'Failed to upload to Supabase Storage', details: uploadError.message });
  }

  // Insert metadata into Supabase table
  const { data, error: insertError } = await supabase
    .from('Document')
    .insert([{
      FacultyID: parseInt(FacultyID, 10),
      DocumentTypeID: parseInt(DocumentTypeID, 10),
      UploadDate: new Date().toISOString(),
      SubmissionStatus,
      // Optionally, add a column for the file path if you want to store it
      // FilePath: filePath
    }])
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'Failed to insert document metadata', details: insertError.message });
  }

  res.status(201).json(data);
});

module.exports = router;