// Main API routes index
// Django-like structure - centralized route imports

const express = require('express');

// Django-like API routes
const userRoutes = require('./api/user/routes');
const authRoutes = require('./api/auth/routes');
const businessRoutes = require('./api/business/routes');
const activityRoutes = require('./api/activity/routes');
const askRoutes = require('./api/aiChat/routes');
const chatRoutes = require('./api/chat/routes');
const knowledgeRoutes = require('./api/knowledge/routes');
const escalationRoutes = require('./api/escalation/routes');
const sessionRoutes = require('./api/session/routes');
const notesRoutes = require('./api/notes/routes');
const emailRoutes = require('./api/email/routes');
const categoryRoutes = require('./api/category/routes');
const faqRoutes = require('./api/faq/routes');
const policyRoutes = require('./api/policy/routes');
const serviceRoutes = require('./api/service/routes');
const productRoutes = require('./api/product/routes');
const agentRoutes = require('./api/agent/routes');  

const api = express.Router();

api.use('/auth', authRoutes);
api.use('/user', userRoutes);
api.use('/business', businessRoutes);
api.use('/activity', activityRoutes);
api.use('/ask', askRoutes);
api.use('/chat', chatRoutes);
api.use('/knowledge', knowledgeRoutes);
api.use('/escalation', escalationRoutes);
api.use('/session', sessionRoutes);
api.use('/notes', notesRoutes);
api.use('/email', emailRoutes);
api.use('/category', categoryRoutes);
api.use('/faq', faqRoutes);
api.use('/policy', policyRoutes);
api.use('/service', serviceRoutes);
api.use('/product', productRoutes);
api.use('/agent', agentRoutes);  // New agent routes

module.exports = api;
