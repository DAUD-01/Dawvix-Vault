const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/test-upload', upload.array('files'), (req, res) => {
  console.log('Headers:', req.headers);
  console.log('Files:', req.files);
  console.log('Body:', req.body);
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }
  res.json({ success: true, count: req.files.length });
});

app.listen(5002, () => console.log('Test server running on 5002'));
