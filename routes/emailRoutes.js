const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');


// Gmail status
router.get('/status', emailController.getStatus);

// Email management routes
router.get('/list', emailController.listEmails);
router.get('/search', emailController.searchEmails);
router.get('/:messageId', emailController.getEmail);
router.post('/send', emailController.sendEmail);
router.post('/reply', emailController.replyToEmail);

// Thread management routes
router.get('/threads/list', emailController.listThreads);
router.get('/threads/:threadId', emailController.getThread);
router.get('/threads/:threadId/messages', emailController.getThreadMessages);

// Email actions
router.patch('/:messageId/read', emailController.markAsRead);
router.patch('/:messageId/unread', emailController.markAsUnread);
router.delete('/:messageId', emailController.deleteEmail);

module.exports = router;
