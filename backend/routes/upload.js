const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.post('/', (req, res) => {
  if (!req.files || !req.files.image && !req.files.uploadedFile && !req.files.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const file = req.files.image || req.files.uploadedFile || req.files.file;
  const ext = path.extname(file.name) || '.jpg';
  const fileName = 'upload_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext;
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uploadPath = path.join(uploadDir, fileName);

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).json({ error: err.message });
    }

    const relativeUrl = 'uploads/' + fileName;
    const fullUrl = `${req.protocol}://${req.get('host')}/${relativeUrl}`;

    return res.json({
      success: true,
      url: relativeUrl,
      fullUrl: fullUrl,
      fileName: fileName,
    });
  });
});

module.exports = router;
