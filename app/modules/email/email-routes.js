const express = require('express');
const router = express.Router();
const emailController = require('./email-controller');

// Email management routes
router.get('/:messageId', emailController.getEmail);
router.post('/send', emailController.sendEmail);
router.post('/reply', emailController.replyToEmail);

// Thread management routes
router.get('/threads/list', emailController.listThreads);
router.get('/threads/:threadId', emailController.getThread);
router.get('/threads/:threadId/messages', emailController.getThreadMessages);

// Email actions
router.patch('/:messageId/read', emailController.markAsRead);

// Attachment management
router.get('/:messageId/attachments/:attachmentId', emailController.downloadAttachment);
router.get('/:messageId/attachments/:attachmentId/preview', emailController.previewAttachment);

module.exports = router;
