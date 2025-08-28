const express = require('express');
const { upload } = require('../../services/fileUploadService');
const fileController = require('./file-controller');

const router = express.Router();

// File upload endpoint
router.post('/upload', upload.single('file'), fileController.uploadFile);

// File download endpoint with proper headers
router.get('/download', fileController.downloadFile);

module.exports = router;
